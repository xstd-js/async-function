import { type AsyncFunction } from '../async-function.ts';
import { type CallAsyncFunction } from './call-async-function.ts';

export type AsyncFunctionLike<GArguments extends readonly unknown[], GReturn> =
  | AsyncFunction<GArguments, GReturn>
  | CallAsyncFunction<GArguments, GReturn>;
