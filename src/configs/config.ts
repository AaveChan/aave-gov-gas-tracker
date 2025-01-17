import { Address } from "viem";

type DelegatePlatform = {
  name: string;
  addresses: Address[];
};

export const delegatePlatforms: DelegatePlatform[] = [
  {
    name: "ACI",
    addresses: [
      "0x57ab7ee15cE5ECacB1aB84EE42D5A9d0d8112922",
      "0x329c54289Ff5D6B7b7daE13592C6B1EDA1543eD4",
      "0x3Cbded22F878aFC8d39dCD744d3Fe62086B76193",
      "0xac140648435d03f784879cd789130F22Ef588Fcd",
    ],
  },
  // {
  //   name: "Catapulta",
  //   addresses: ["0x020E4359255f907DF480EbFfc8a7b7beac0c0216"],
  // },
];
