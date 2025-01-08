import "dotenv/config";
import {
  arbitrum,
  avalanche,
  base,
  gnosis,
  mainnet,
  metis,
  optimism,
  polygon,
  zksync,
  scroll,
  bsc,
} from "viem/chains";
import { Chain, createPublicClient, http } from "viem";

const getAlchemyPrefix = (chain: Chain) => {
  switch (chain.id) {
    case mainnet.id:
      return "eth-mainnet";
    case base.id:
      return "base-mainnet";
    case arbitrum.id:
      return "arb-mainnet";
    case optimism.id:
      return "opt-mainnet";
    case zksync.id:
      return "zksync-mainnet";
    case polygon.id:
      return "polygon-mainnet";
    case avalanche.id:
      return "avax-mainnet";
    case gnosis.id:
      return "gnosis-mainnet";
    case metis.id:
      return "metis-mainnet";
    case scroll.id:
      return "scroll-mainnet";
    case bsc.id:
      return "bnb-mainnet";
    default:
      return null;
  }
};

const getAlchemyClient = (prefix: string, chain: Chain) => {
  return createPublicClient({
    cacheTime: 0,
    batch: {
      multicall: true,
    },
    chain: chain,
    transport: http(
      `https://${prefix}.g.alchemy.com/v2/` + process.env.ALCHEMY_API_KEY
    ),
  });
};

export const getViemClient = (chain: Chain) => {
  const alchemyProjectId = process.env.ALCHEMY_API_KEY;
  const prefix = getAlchemyPrefix(chain);

  if (alchemyProjectId && prefix) {
    return getAlchemyClient(prefix, chain);
  } else {
    return createPublicClient({
      chain: chain,
      transport: http(),
    });
  }
};

export type ViemClient = ReturnType<typeof getViemClient>;
