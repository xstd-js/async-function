import { type AsyncFunction } from '../../../async-function.ts';

/**
 * Transforms an `AsyncFunction` instance into another value.
 *
 * @template GSelf The type of the `AsyncFunction` instance to transform.
 * @template GReturn The type of the value returned by the transformation.
 *
 * @param {GSelf} self The `AsyncFunction` instance to transform.
 * @returns {GReturn} The result of the transformation.
 */
export interface TransformAsyncFunctionFunction<GSelf extends AsyncFunction<any, any>, GReturn> {
  (self: GSelf): GReturn;
}
