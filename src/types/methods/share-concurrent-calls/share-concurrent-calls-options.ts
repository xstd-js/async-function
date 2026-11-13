/**
 * Options for the `AsyncFunction.shareConcurrentCalls` method.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the function.
 */
export interface ShareConcurrentCallsOptions<GArguments extends readonly unknown[]> {
  /**
   * Generates a cache key from the call's arguments. Concurrent calls producing the same key share their result.
   */
  readonly keyGenerator: ShareConcurrentCallsKeyGenerator<GArguments>;
}

/**
 * Generates a cache key from the call's arguments.
 *
 * @template GArguments The tuple type representing the arguments to be provided to the function.
 *
 * @param {...GArguments} args The arguments to be provided to the function.
 * @returns {string} The key identifying concurrent calls to share.
 */
export interface ShareConcurrentCallsKeyGenerator<GArguments extends readonly unknown[]> {
  (args: GArguments): string;
}
