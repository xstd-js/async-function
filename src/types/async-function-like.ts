import { type AsyncFunction } from '../async-function.ts';
import { type CallAsyncFunction } from './call-async-function.ts';

/**
 * Represents anything that can be wrapped into an `AsyncFunction`: either an existing `AsyncFunction` instance, or a plain call function.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the function.
 * @template GReturn The type of the value returned by the async function.
 */
export type AsyncFunctionLike<GArguments extends readonly unknown[], GReturn> =
  AsyncFunction<GArguments, GReturn> | CallAsyncFunction<GArguments, GReturn>;
