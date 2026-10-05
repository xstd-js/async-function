/**
 * Represents an interface for calling an async function with specific arguments and result.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the function.
 * @template GReturn The type of the value returned by the async function.
 *
 * @param {AbortSignal} signal A signal to abort the async function execution.
 * @param {...GArguments} args The arguments to be provided to the function.
 * @returns {PromiseLike<GReturn> | GReturn} The result of the async function execution, which can be either a resolved value or a Promise-like object resolving the value.
 */
export interface CallAsyncFunction<GArguments extends readonly unknown[], GReturn> {
  (signal: AbortSignal, ...args: GArguments): PromiseLike<GReturn> | GReturn;
}
