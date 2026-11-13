import { type AsyncFunctionThenOnRejectedFunction } from './async-function.then.on-rejected-function.ts';

/**
 * Default rejection handler: re-throws the received error.
 */
export const DEFAULT_ASYNC_FUNCTION_THEN_ON_REJECTED_FUNCTION: AsyncFunctionThenOnRejectedFunction<
  any
> = (error: any): any => {
  throw error;
};
