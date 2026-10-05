export interface MapFunctionArguments<
  GArguments extends readonly unknown[],
  GNewArguments extends readonly unknown[],
> {
  (...args: GNewArguments): GArguments;
}
