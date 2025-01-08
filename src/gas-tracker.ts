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

type AddressGasInfo = {
  address: Address;
  gasUsed: bigint;
  cancellationFeesUsed: bigint;
};

export type DelegatePlatformFees = {
  name: string;
  addresses: AddressGasInfo[];
};

const trackAddressesGas = async () => {
  requireEnv();

  if (!process.env.START_BLOCK || !process.env.END_BLOCK) {
    throw new Error("Missing start or end block");
  }
  const startBlock = BigInt(process.env.START_BLOCK);
  const endBlock = BigInt(process.env.END_BLOCK);

  const delegatePlatformsWithFees: DelegatePlatformFees[] = [];

  for (const delegatePlatform of delegatePlatforms) {
    delegatePlatformsWithFees.push({
      name: delegatePlatform.name,
      addresses: [],
    });

    for (const address of delegatePlatform.addresses) {
      const gas = await getAllGasUsed(address, startBlock, endBlock);

      const cancellationFees = await getCancellationFees(
        address,
        startBlock,
        endBlock
      );

      delegatePlatformsWithFees[
        delegatePlatformsWithFees.length - 1
      ].addresses.push({
        address,
        gasUsed: gas,
        cancellationFeesUsed: cancellationFees,
      });
    }
  }

  generateReport(delegatePlatformsWithFees);
};

/**
 * Returns the total gas used by an address in wei
 * @param address
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

const getCancellationFees = async (
  address: Address,
  startBlock: bigint,
  endBlock: bigint
) => {
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

  const cancellationFee = parseEther("0.05");

  const totalCancellationFee =
    BigInt(allProposalsCanceledByAddress.length) * cancellationFee;

  console.log(
    `🔍 Found ${allProposalsCanceledByAddress.length} proposals canceled for ${address}`
  );

  return totalCancellationFee;
};

trackAddressesGas();
