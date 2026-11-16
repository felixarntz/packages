import type { AsyncHelper, AsyncHelperOptions } from "./types";
import { assertNonNegativeFinite } from "./util/assertions";

export function createWithDeadline(options: {
  deadlineMs: number;
}): AsyncHelper {
  assertNonNegativeFinite({ name: "deadlineMs", value: options.deadlineMs });

  return async (helperOptions) => {
    const timeoutSignal = AbortSignal.timeout(options.deadlineMs);
    const abortSignal = helperOptions.abortSignal
      ? AbortSignal.any([helperOptions.abortSignal, timeoutSignal])
      : timeoutSignal;
    const result = helperOptions.fn({ abortSignal });

    return await new Promise((resolve, reject) => {
      result.then(resolve, reject);

      if (abortSignal.aborted) {
        reject(abortSignal.reason);
        return;
      }

      abortSignal.addEventListener(
        "abort",
        () => {
          reject(abortSignal.reason);
        },
        { once: true }
      );
    });
  };
}

export function withDeadline<T>(
  options: AsyncHelperOptions<T, { deadlineMs: number }>
): Promise<T> {
  const run = createWithDeadline({ deadlineMs: options.deadlineMs });
  return run({ abortSignal: options.abortSignal, fn: options.fn });
}
