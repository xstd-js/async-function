export interface ShareConcurentCallsOptions<GArguments extends readonly unknown[]> {
  readonly keyGenerator: ShareConcurentCallsKeyGenerator<GArguments>;
}

export interface ShareConcurentCallsKeyGenerator<GArguments extends readonly unknown[]> {
  (args: GArguments): string;
}
