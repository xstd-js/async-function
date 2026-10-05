export interface AsyncFunctionThenOnRejectedFunction<GNewReturn> {
  (error: unknown, signal: AbortSignal): PromiseLike<GNewReturn> | GNewReturn;
}
