import { type AsyncFunctionThenOnFulfilledFunction } from './async-function.then.on-fulfilled-function.ts';

/**
 * Default fulfilment handler: passes the resolved value through unchanged.
 */
export const DEFAULT_ASYNC_FUNCTION_THEN_ON_FULFILLED_FUNCTION: AsyncFunctionThenOnFulfilledFunction<
  any,
  any
> = (value: any): any => value;
