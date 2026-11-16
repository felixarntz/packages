export function assertNonNegativeFinite(options: {
  name: string;
  value: number;
}): void {
  if (!Number.isFinite(options.value) || options.value < 0) {
    throw new RangeError(
      `${options.name} must be a finite number greater than or equal to 0.`
    );
  }
}

export function assertRetries(options: { retries: number }): void {
  if (!Number.isInteger(options.retries) || options.retries < 0) {
    throw new RangeError(
      "retries must be an integer greater than or equal to 0."
    );
  }
}
