import "dotenv/config";
import { etherscanProvider } from "./clients/ethers-client";
import { Address } from "viem";
import { delegatePlatforms } from "./configs/config";
import { requireEnv } from "./utils/requires";
import { generateReport } from "./services/report";

type AddressGasInfo = {
  address: Address;
  gasUsed: bigint;
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
      delegatePlatformsWithFees[
        delegatePlatformsWithFees.length - 1
      ].addresses.push({
        address,
        gasUsed: gas,
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

trackAddressesGas();
