/**
 * Handles the resolved value of an async function call, like the first parameter of `Promise.then`.
 *
 * @template GReturn The type of the value resolved by the async function.
 * @template GNewReturn The type of the value returned by the handler.
 *
 * @param {GReturn} value The value resolved by the async function.
 * @param {AbortSignal} signal The `AbortSignal` received by the call, forwarded to the handler.
 * @returns {PromiseLike<GNewReturn> | GNewReturn} The new value, or a promise of it.
 */
export interface AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn> {
  (value: GReturn, signal: AbortSignal): PromiseLike<GNewReturn> | GNewReturn;
}
