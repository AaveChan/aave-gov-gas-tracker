import "dotenv/config";
import { etherscanProvider } from "./clients/ethers-client";
import { Address, parseEther } from "viem";
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

export type FeesInfos = {
  totalFees: bigint;
  fees: {
    [feetype in FeesTypes]: bigint;
  };
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

      const totalFees = allTxsGas + proposalCanceledFees;

      addressesFees.set(address, {
        totalFees: totalFees,
        fees: {
          allTxsGas,
          proposalCanceledFees,
        },
      });
    }

    const totalFeesInfos = Array.from(addressesFees.values()).reduce(
      (acc, cur) => {
        return {
          totalFees: acc.totalFees + cur.totalFees,
          fees: {
            [FeesTypes.allTxsGas]: acc.fees.allTxsGas + cur.fees.allTxsGas,
            [FeesTypes.proposalCanceledFees]:
              acc.fees.proposalCanceledFees + cur.fees.proposalCanceledFees,
          },
        };
      },
      {
        totalFees: 0n,
        fees: {
          [FeesTypes.allTxsGas]: 0n,
          [FeesTypes.proposalCanceledFees]: 0n,
        },
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
  const cancellationFee = parseEther("0.05");

  const viemClient = getViemClient(mainnet);

  const proposalCreatedEvents = await fetchEventsInBatches(
    {
      address: GovernanceV3Ethereum.GOVERNANCE,
      abi: GovernanceV3EthereumGovernanceABI,
      eventName: "ProposalCreated",
      fromBlock: startBlock,
      toBlock: endBlock,
      args: {
        creator: address,
      },
    },
    viemClient
  );
  const proposalIds = new Set(
    proposalCreatedEvents
      .map((event) => event.args.proposalId)
      .filter((id) => id !== undefined)
  );

  const allProposalCanceledEvents = await fetchEventsInBatches(
    {
      address: GovernanceV3Ethereum.GOVERNANCE,
      abi: GovernanceV3EthereumGovernanceABI,
      eventName: "ProposalCanceled",
      fromBlock: startBlock,
      toBlock: endBlock,
    },
    viemClient
  );
  const allProposalsCanceledByAddress = allProposalCanceledEvents
    .map((event) => event.args.proposalId)
    .filter((id) => id && proposalIds.has(id));

  const totalCancellationFee =
    BigInt(allProposalsCanceledByAddress.length) * cancellationFee;

  console.log(
    `🔍 Found ${allProposalsCanceledByAddress.length} proposals canceled for ${address}`
  );

  return totalCancellationFee;
};

trackAddressesGas();
