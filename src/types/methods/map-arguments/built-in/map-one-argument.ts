import type { MapFunctionArguments } from '../map-function-arguments.ts';

/**
 * Used to map the first argument of a Flow to another one.
 *
 * @template GIn - The type of the source argument.
 * @template GOut - The type of the destination argument.
 * @param {(value: GIn) => GOut} mapFnc - The function to map the source argument to the destination one.
 * @returns {MapFunctionArguments<[GOut], [GIn]>} - A function that maps one argument to another one.
 *
 * @example
 *
 * ```ts
 * const value = await fnc.mapArguments(mapOneArgument(Number)).call(signal, '10');
 * ``
 */
export function mapOneArgument<GIn, GOut>(mapFnc: (value: GIn) => GOut): MapFunctionArguments<[GOut], [GIn]> {
  return (value: GIn): [GOut] => [mapFnc(value)];
}
