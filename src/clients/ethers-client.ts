import { Network } from "ethers";
import { EtherscanProvider, Networkish, BlockTag } from "ethers"; //^v6
import { Address } from "viem";

type GetHistoryReturn = {
  blockNumber: string; // bigint
  blockHash: `0x${string}`;
  timeStamp: string; // bigint
  hash: `0x${string}`;
  nonce: string; // number
  transactionIndex: string; // number
  from: Address;
  to: Address;
  value: string; // bigint
  gas: string; // bigint
  gasPrice: string; // bigint
  input: `0x${string}`;
  methodId: `0x${string}`;
  functionName: string;
  contractAddress: Address;
  cumulativeGasUsed: string; // bigint
  txreceipt_status: string; // number
  gasUsed: string; // bigint
  confirmations: string; // number
  isError: string; // number
};

// no getHistory in ethers v6
// go from https://ethereum.stackexchange.com/a/150836
export default class EtherscanProviderImproved extends EtherscanProvider {
  constructor(networkish: Networkish, apiKey?: string) {
    super(networkish, apiKey);
  }

  async getHistory(
    address: string,
    startBlock?: BlockTag,
    endBlock?: BlockTag
  ): Promise<Array<GetHistoryReturn>> {
    const params = {
      action: "txlist",
      address,
      startblock: startBlock == null ? 0 : startBlock,
      endblock: endBlock == null ? 99999999 : endBlock,
      sort: "asc",
    };

    return this.fetch("account", params);
  }
}

export const etherscanProvider = new EtherscanProviderImproved(
  new Network("mainnet", 1),
  process.env.ETHERSCAN_API_KEY
);
