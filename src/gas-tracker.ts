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

  const delegatePlatformsWithFees: DelegatePlatformFees[] = [];

  for (const delegatePlatform of delegatePlatforms) {
    delegatePlatformsWithFees.push({
      name: delegatePlatform.name,
      addresses: [],
    });

    for (const address of delegatePlatform.addresses) {
      const gas = await getAllGasUsed(address);
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
const getAllGasUsed = async (address: Address) => {
  const history = await etherscanProvider.getHistory(
    address,
    process.env.START_BLOCK,
    process.env.END_BLOCK
  );
  const totalGasUsed = history.reduce(
    (acc, curr) => acc + BigInt(curr.gasUsed) * BigInt(curr.gasPrice),
    0n
  );
  return totalGasUsed;
};

trackAddressesGas();
