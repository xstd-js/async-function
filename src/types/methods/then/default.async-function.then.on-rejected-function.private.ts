import { type AsyncFunctionThenOnRejectedFunction } from './async-function.then.on-rejected-function.ts';

export const DEFAULT_ASYNC_FUNCTION_THEN_ON_REJECTED_FUNCTION: AsyncFunctionThenOnRejectedFunction<any> = (
  error: any,
): any => {
  throw error;
};
