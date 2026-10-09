import type { MapFunctionArguments } from '../map-function-arguments.ts';

/**
 * Used to set the arguments of an AsyncFunction.
 *
 * @param args - The arguments to set.
 * @returns {MapFunctionArguments<GArguments, []>} - A function that maps no arguments to a list of predefined ones.
 *
 * @example
 *
 * ```ts
 * const value = await fnc.mapArguments(setArguments(10)).call(signal);
 * ``
 */
export function setArguments<GArguments extends readonly unknown[]>(
  ...args: GArguments
): MapFunctionArguments<GArguments, []> {
  return (): GArguments => args;
}
