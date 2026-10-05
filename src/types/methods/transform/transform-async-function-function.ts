import { type AsyncFunction } from '../../../async-function.ts';

export interface TransformAsyncFunctionFunction<GSelf extends AsyncFunction<any, any>, GReturn> {
  (self: GSelf): GReturn;
}
