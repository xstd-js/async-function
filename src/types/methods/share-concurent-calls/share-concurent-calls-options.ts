/**
 * Options for the `AsyncFunction.shareConcurentCalls` method.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the function.
 */
export interface ShareConcurentCallsOptions<GArguments extends readonly unknown[]> {
  /**
   * Generates a cache key from the call's arguments. Concurrent calls producing the same key share their result.
   */
  readonly keyGenerator: ShareConcurentCallsKeyGenerator<GArguments>;
}

/**
 * Generates a cache key from the call's arguments.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the function.
 *
 * @param {...GArguments} args The arguments to be provided to the function.
 * @returns {string} The key identifying concurrent calls to share.
 */
export interface ShareConcurentCallsKeyGenerator<GArguments extends readonly unknown[]> {
  (args: GArguments): string;
}
