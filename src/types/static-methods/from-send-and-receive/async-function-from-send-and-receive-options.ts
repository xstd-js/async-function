import { type AsyncFunctionLike } from '../../async-function-like.ts';

export interface AsyncFunctionFromSendAndReceiveOptions<GArguments extends readonly unknown[], GReturn> {
  readonly send: AsyncFunctionLike<GArguments, void>;
  readonly receive: AsyncFunctionLike<GArguments, GReturn>;
}
