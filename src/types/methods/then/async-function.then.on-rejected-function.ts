/**
 * Handles the error thrown by an async function call, like the second parameter of `Promise.then`.
 *
 * @template GNewReturn The type of the value returned by the handler.
 *
 * @param {unknown} error The error thrown by the async function.
 * @param {AbortSignal} signal The `AbortSignal` received by the call, forwarded to the handler.
 * @returns {PromiseLike<GNewReturn> | GNewReturn} A fallback value, or a promise of it.
 */
export interface AsyncFunctionThenOnRejectedFunction<GNewReturn> {
  (error: unknown, signal: AbortSignal): PromiseLike<GNewReturn> | GNewReturn;
}
