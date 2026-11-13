import { type AsyncFunctionLike } from '../../async-function-like.ts';

/**
 * Options for the `AsyncFunction.fromSendAndReceive` static method.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the send and receive functions.
 * @template GReturn The type of the value returned by the receive function.
 */
export interface AsyncFunctionFromSendAndReceiveOptions<
  GArguments extends readonly unknown[],
  GReturn,
> {
  /**
   * The "push" async function to trigger (e.g. sending a command or message). Must not return a value.
   */
  readonly send: AsyncFunctionLike<GArguments, void>;
  /**
   * The "pull" async function to await (e.g. listening for a response or event). Returns the result.
   */
  readonly receive: AsyncFunctionLike<GArguments, GReturn>;
}
