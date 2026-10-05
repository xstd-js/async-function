export interface AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn> {
  (value: GReturn, signal: AbortSignal): PromiseLike<GNewReturn> | GNewReturn;
}
