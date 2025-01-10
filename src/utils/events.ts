import {
  Abi,
  Address,
  BlockNumber,
  ContractEventArgs,
  ContractEventName,
} from "viem";
import { ViemClient } from "./viem-client";

// built form GetContractEventsParameters from viem
export type GetContractEventsParametersExtended<
  abi extends Abi | readonly unknown[] = Abi,
  eventName extends ContractEventName<abi> | undefined =
    | ContractEventName<abi>
    | undefined,
  strict extends boolean | undefined = undefined
> = {
  /** The address of the contract. */
  address?: Address | Address[] | undefined;
  /** Contract ABI. */
  abi: abi;
  args?:
    | ContractEventArgs<
        abi,
        eventName extends ContractEventName<abi>
          ? eventName
          : ContractEventName<abi>
      >
    | undefined;
  /** Contract event. */
  eventName?: eventName | ContractEventName<abi> | undefined;
  /**
   * Whether or not the logs must match the indexed/non-indexed arguments on `event`.
   * @default false
   */
  strict?: strict | boolean | undefined;
} & {
  /** Block number or tag after which to include logs */
  fromBlock: BlockNumber;
  /** Block number or tag before which to include logs */
  toBlock: BlockNumber;
} & {
  batchSize?: bigint;
};

export const fetchEventsInBatches = async <
  const abi extends readonly unknown[] | Abi,
  eventName extends ContractEventName<abi> | undefined = undefined,
  TStrict extends boolean | undefined = undefined
>(
  parameters: GetContractEventsParametersExtended<abi, eventName, TStrict>,
  viemClient: ViemClient,
  batchSize = 100000n // warning: for contract with a lot of events, it can be slow or cause timeout. In this case, you can reduce the batch size (eg: to fetch all aave events, use 10k)
) => {
  const { abi, address, args, eventName, fromBlock, toBlock } = parameters;

  // Prevent error returning all events
  type ABIEvent = {
    name?: string;
    type?: string;
  };

  const events = abi.filter(
    (event) =>
      (event as ABIEvent).name === eventName &&
      (event as ABIEvent).type === "event"
  );

  if (eventName && events.length === 0) {
    throw new Error(
      `fetchEventsInBatches: No event found in the ABI for the event name ${eventName}`
    );
  }

  if (parameters.batchSize) {
    batchSize = parameters.batchSize;
  }

  let startBlock = fromBlock;

  const allEvents = [];

  while (startBlock <= toBlock) {
    const nextBlock = startBlock + batchSize - 1n;
    const endBlock = nextBlock < toBlock ? nextBlock : toBlock;
    const events = await viemClient.getContractEvents({
      address: address,
      abi: abi,
      eventName: eventName,
      args: args,
      fromBlock: startBlock,
      toBlock: endBlock,
    });

    allEvents.push(...events);
    startBlock = endBlock + 1n;
  }

  return allEvents;
};
