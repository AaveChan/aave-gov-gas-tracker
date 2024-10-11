// Setup: npm install alchemy-sdk
import "dotenv/config";
import { etherscanProvider } from "./clients/ethers-client";
import { Address } from "viem";
import { delegatePlatforms } from "./configs/config";
// import { etherscanProvider } from "./utils/ethers-client";
// import { Alchemy, AssetTransfersCategory, Network } from "alchemy-sdk";

// const config = {
//   apiKey: process.env.ALCHEMY_API_KEY,
//   network: Network.ETH_MAINNET,
// };
// const alchemy = new Alchemy(config);

type AddressGasInfo = {
  address: Address;
  gasUsed: bigint;
};

type DelegatePlatformFees = {
  name: string;
  addresses: AddressGasInfo[];
};

const trackAddressesGas = async () => {
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

  // const data = await alchemy.core.getAssetTransfers({
  //   fromBlock: "0x0",
  //   toBlock: "0x13F75AE",
  //   toAddress: "0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922",
  //   category: [
  //     AssetTransfersCategory.EXTERNAL,
  //     // AssetTransfersCategory.INTERNAL,
  //     // AssetTransfersCategory.ERC20,
  //     // AssetTransfersCategory.ERC721,
  //     // AssetTransfersCategory.ERC1155,
  //     // AssetTransfersCategory.SPECIALNFT,
  //   ],
  // });
  // console.log(data.transfers.length);
  // console.log(data.transfers[data.transfers.length - 1]);
  // console.log(data.transfers[data.transfers.length - 2]);
  // console.log(data.transfers[data.transfers.length - 3]);
  const history = await etherscanProvider.getHistory(
    "0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922",
    20936070,
    20942810
  );
  console.log(history);
  console.log(delegatePlatformsWithFees.find((x) => x.name === "ACI"));
};

/**
 * Returns the total gas used by an address in wei
 * @param address
 * @returns
 */
const getAllGasUsed = async (address: Address) => {
  const history = await etherscanProvider.getHistory(
    address,
    20936070,
    20942810
  );
  const totalGasUsed = history.reduce(
    (acc, curr) => acc + BigInt(curr.gasUsed) * BigInt(curr.gasPrice),
    0n
  );
  return totalGasUsed;
};

trackAddressesGas();
