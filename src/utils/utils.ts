import * as chains from "viem/chains";

export function getChain(id: number) {
  const chain = Object.values(chains).find((x) => x.id === id);
  if (!chain) {
    throw new Error(`Chain with id ${id} not found`);
  }
  return chain;
}
