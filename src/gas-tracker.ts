import "dotenv/config";
import { etherscanProvider } from "./clients/ethers-client";
import { Address } from "viem";
import { delegatePlatforms } from "./configs/config";
import { requireEnv } from "./utils/requires";
import { generateReport } from "./services/report";
import { getViemClient } from "./utils/viem-client";
import { mainnet } from "viem/chains";
import { fetchEventsInBatches } from "./utils/events";
import { GovernanceV3Ethereum } from "@bgd-labs/aave-address-book";
import { GovernanceV3EthereumGovernanceABI } from "./abis/governance-v3-ethereum-governance";

export enum FeesTypes {
  allTxsGas = "allTxsGas",
  proposalCanceledFees = "proposalCanceledFees",
}

export const feesTypesNames = {
  [FeesTypes.allTxsGas]: "All txs gas spent (ETH)",
  [FeesTypes.proposalCanceledFees]: "Proposal cancellation fees spent (ETH)",
};

type Fees = {
  [feetype in FeesTypes]: bigint;
};

export type FeesInfos = {
  totalFees: bigint;
  fees: Fees;
};

export type DelegatePlatformFees = {
  totalFeesInfos: FeesInfos;
  addressesFees: Map<Address, FeesInfos>; // address <-> FeesInfos
};

export type AllDelegatePlatformsFees = Map<string, DelegatePlatformFees>; // name <-> DelegatePlatformFees

const trackAddressesGas = async () => {
  requireEnv();

  if (!process.env.START_BLOCK || !process.env.END_BLOCK) {
    throw new Error("Missing start or end block");
  }
  const startBlock = BigInt(process.env.START_BLOCK);
  const endBlock = BigInt(process.env.END_BLOCK);

  const delegatePlatformsWithFees: AllDelegatePlatformsFees = new Map();

  for (const delegatePlatform of delegatePlatforms) {
    const addressesFees = new Map<Address, FeesInfos>();

    for (const address of delegatePlatform.addresses) {
      const allTxsGas = await getAllGasUsed(address, startBlock, endBlock);

      const proposalCanceledFees = await getAllPropositionCanceledFees(
        address,
        startBlock,
        endBlock
      );

      const fees: Fees = {
        [FeesTypes.allTxsGas]: allTxsGas,
        [FeesTypes.proposalCanceledFees]: proposalCanceledFees,
      };

      const feesInfos: FeesInfos = {
        totalFees: Object.values(fees).reduce((acc, cur) => acc + cur, 0n),
        fees: {
          ...fees,
        },
      };

      addressesFees.set(address, feesInfos);
    }

    const totalFeesInfos = Array.from(addressesFees.values()).reduce(
      (acc: FeesInfos, cur: FeesInfos) => {
        const updatedFees: Fees = { ...acc.fees };
        for (const feeType of Object.values(FeesTypes)) {
          updatedFees[feeType] =
            (updatedFees[feeType] || 0n) + cur.fees[feeType];
        }
        return {
          totalFees: acc.totalFees + cur.totalFees,
          fees: updatedFees,
        };
      },
      {
        totalFees: 0n,
        fees: Object.fromEntries(
          Object.values(FeesTypes).map((feeType) => [feeType, 0n])
        ) as Fees,
      }
    );

    const delegatePlatformsFees: DelegatePlatformFees = {
      totalFeesInfos: totalFeesInfos,
      addressesFees: addressesFees,
    };

    delegatePlatformsWithFees.set(delegatePlatform.name, delegatePlatformsFees);
  }

  generateReport(delegatePlatformsWithFees);
};

/**
 * Returns the total gas used by an address in wei
 * @param address
 * @param startBlock
 * @param endBlock
 * @returns
 */
const getAllGasUsed = async (
  address: Address,
  startBlock: bigint,
  endBlock: bigint
) => {
  const history = await etherscanProvider.getHistory(
    address,
    startBlock,
    endBlock
  );
  console.log(`🔍 Found ${history.length} transactions for ${address}`);
  const totalGasUsed = history.reduce(
    (acc, cur) => acc + BigInt(cur.gasUsed) * BigInt(cur.gasPrice),
    0n
  );
  return totalGasUsed;
};

/**
 * Returns the total cancellation fees used by an address in wei
 * More info: https://governance.aave.com/t/bgd-aave-governance-v3-activation-plan/14993#cancellation-fee-10
 * @param address
 * @param startBlock
 * @param endBlock
 * @returns
 */
const getAllPropositionCanceledFees = async (
  address: Address,
  startBlock: bigint,
  endBlock: bigint
) => {
  const viemClient = getViemClient(mainnet);

  const cancellationFee = await viemClient.readContract({
    address: GovernanceV3Ethereum.GOVERNANCE,
    abi: GovernanceV3EthereumGovernanceABI,
    functionName: "getCancellationFee",
  });

  // 2 access of controll: https://etherscan.io/address/0x58bcb647c4beff253b4b6996c62f737b783f2cdd#code#F18#L10
  // Level_1 & Level_2
  const votingConfigLevels = await viemClient.multicall({
    contracts: [
      {
        address: GovernanceV3Ethereum.GOVERNANCE,
        abi: GovernanceV3EthereumGovernanceABI,
        functionName: "getVotingConfig",
        args: [1],
      },
      {
        address: GovernanceV3Ethereum.GOVERNANCE,
        abi: GovernanceV3EthereumGovernanceABI,
        functionName: "getVotingConfig",
        args: [2],
      },
    ],
  });

  if (!votingConfigLevels[0].result || !votingConfigLevels[1].result) {
    throw new Error("Could not fetch voting configs");
  }

  // get the max voting delay
  const maxVotingDelay = Math.max(
    votingConfigLevels[0].result.votingDuration,
    votingConfigLevels[1].result.votingDuration
  );
  const maxCoolDownBeforeVotingStart = Math.max(
    votingConfigLevels[0].result.coolDownBeforeVotingStart,
    votingConfigLevels[1].result.coolDownBeforeVotingStart
  );
  const buffer = 60 * 60 * 24 * 7; // 1 week in seconds

  const secondsPerBlock = 12; // ethereum mainnet

  const totalProposalLifetime =
    maxVotingDelay + maxCoolDownBeforeVotingStart + buffer;
  const totalProposalLifetimeInBlocks = totalProposalLifetime / secondsPerBlock;

  // A proposal can be only canceled if it's strictly between the Null and Executed state (so only in Created, Active and Queued states)
  // See states here: https://etherscan.io/address/0x58bcb647c4beff253b4b6996c62f737b783f2cdd#code#F10#L75
  // So we only need to fetch the proposal that happened maxVotingDelay before the startBlock and until the endBlock
  const allProposalCreatedEvents = await fetchEventsInBatches(
    {
      address: GovernanceV3Ethereum.GOVERNANCE,
      abi: GovernanceV3EthereumGovernanceABI,
      eventName: "ProposalCreated",
      fromBlock: startBlock - BigInt(totalProposalLifetimeInBlocks),
      toBlock: endBlock,
      args: {
        creator: address,
      },
    },
    viemClient
  );
  const proposalIds = new Set(
    allProposalCreatedEvents
      .map((event) => event.args.proposalId)
      .filter((id) => id !== undefined)
  );

  const proposalCanceledEvents = await fetchEventsInBatches(
    {
      address: GovernanceV3Ethereum.GOVERNANCE,
      abi: GovernanceV3EthereumGovernanceABI,
      eventName: "ProposalCanceled",
      fromBlock: startBlock,
      toBlock: endBlock,
    },
    viemClient
  );
  const proposalsCanceledByAddress = proposalCanceledEvents
    .map((event) => event.args.proposalId)
    .filter((id) => id && proposalIds.has(id));

  const totalCancellationFee =
    BigInt(proposalsCanceledByAddress.length) * cancellationFee;

  console.log(
    `🔍 Found ${proposalsCanceledByAddress.length} proposals canceled for ${address}`
  );

  return totalCancellationFee;
};

trackAddressesGas();
