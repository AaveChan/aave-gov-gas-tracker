import { BlockTag } from "ethers"; //^v6
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

type EtherscanV2Response<T> = {
  status: string;
  message: string;
  result: T;
};

const ETHERSCAN_V2_BASE_URL = "https://api.etherscan.io/v2/api";

export default class EtherscanProviderImproved {
  private readonly apiKey?: string;
  private readonly chainId: number;

  constructor(chainId: number, apiKey?: string) {
    this.chainId = chainId;
    this.apiKey = apiKey;
  }

  async getHistory(
    address: string,
    startBlock?: BlockTag,
    endBlock?: BlockTag
  ): Promise<Array<GetHistoryReturn>> {
    const params = new URLSearchParams({
      chainid: String(this.chainId),
      module: "account",
      action: "txlist",
      address,
      startblock: startBlock == null ? "0" : String(startBlock),
      endblock: endBlock == null ? "99999999" : String(endBlock),
      sort: "asc",
    });
    if (this.apiKey) {
      params.set("apikey", this.apiKey);
    }

    const response = await fetch(`${ETHERSCAN_V2_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(
        `Etherscan v2 request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as EtherscanV2Response<
      Array<GetHistoryReturn>
    >;
    if (json.status === "1" && Array.isArray(json.result)) {
      return json.result;
    }
    if (json.message?.toLowerCase().includes("no transactions")) {
      return [];
    }

    throw new Error(`Etherscan v2 error: ${json.message ?? "unknown"}`);
  }
}

export const etherscanProvider = new EtherscanProviderImproved(
  1,
  process.env.ETHERSCAN_API_KEY
);
