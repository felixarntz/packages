import { setTimeout as wait } from "node:timers/promises";
import type { AsyncHelper, AsyncHelperOptions } from "./types";
import { assertNonNegativeFinite } from "./util/assertions";
import { linkAbortSignal } from "./util/link-abort-signal";

export function createWithDelay(options: { delayMs: number }): AsyncHelper {
  assertNonNegativeFinite({ name: "delayMs", value: options.delayMs });

  return async (helperOptions) => {
    const controller = linkAbortSignal({
      abortSignal: helperOptions.abortSignal,
    });

    try {
      await wait(options.delayMs, undefined, { signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }
      throw error;
    }

    return await helperOptions.fn({ abortSignal: controller.signal });
  };
}

export function withDelay<T>(
  options: AsyncHelperOptions<T, { delayMs: number }>
): Promise<T> {
  const run = createWithDelay({ delayMs: options.delayMs });
  return run({ abortSignal: options.abortSignal, fn: options.fn });
}
