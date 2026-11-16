import { setTimeout as wait } from "node:timers/promises";
import type { AsyncHelper, AsyncHelperOptions } from "./types";
import { assertNonNegativeFinite, assertRetries } from "./util/assertions";
import { linkAbortSignal } from "./util/link-abort-signal";

export function createWithRetry(options: {
  retries: number;
  retryDelayMs: number | ((retryCount: number) => number);
}): AsyncHelper {
  assertRetries({ retries: options.retries });

  if (typeof options.retryDelayMs === "number") {
    assertNonNegativeFinite({
      name: "retryDelayMs",
      value: options.retryDelayMs,
    });
  }

  return async (helperOptions) => {
    for (let attempt = 0; attempt <= options.retries; attempt += 1) {
      if (helperOptions.abortSignal?.aborted) {
        throw helperOptions.abortSignal.reason;
      }

      const controller = linkAbortSignal({
        abortSignal: helperOptions.abortSignal,
      });

      try {
        // biome-ignore lint/performance/noAwaitInLoops: each attempt starts only after the previous one fails
        return await helperOptions.fn({ abortSignal: controller.signal });
      } catch (error) {
        if (helperOptions.abortSignal?.aborted) {
          throw helperOptions.abortSignal.reason;
        }

        if (attempt === options.retries) {
          throw error;
        }
      } finally {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }

      await waitForRetry({
        abortSignal: helperOptions.abortSignal,
        attempt,
        retryDelayMs: options.retryDelayMs,
      });
    }

    throw new Error("withRetry ended without a result.");
  };
}

export function withRetry<T>(
  options: AsyncHelperOptions<
    T,
    {
      retries: number;
      retryDelayMs: number | ((retryCount: number) => number);
    }
  >
): Promise<T> {
  const run = createWithRetry({
    retries: options.retries,
    retryDelayMs: options.retryDelayMs,
  });
  return run({ abortSignal: options.abortSignal, fn: options.fn });
}

async function waitForRetry(options: {
  abortSignal?: AbortSignal;
  attempt: number;
  retryDelayMs: number | ((retryCount: number) => number);
}): Promise<void> {
  const retryCount = options.attempt + 1;
  const retryDelayMs =
    typeof options.retryDelayMs === "number"
      ? options.retryDelayMs
      : options.retryDelayMs(retryCount);

  assertNonNegativeFinite({ name: "retryDelayMs", value: retryDelayMs });

  const controller = linkAbortSignal({ abortSignal: options.abortSignal });

  try {
    await wait(retryDelayMs, undefined, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw controller.signal.reason;
    }
    throw error;
  }
}
