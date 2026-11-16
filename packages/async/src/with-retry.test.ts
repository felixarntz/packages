import { describe, expect, it } from "vitest";
import { withRetry } from "./with-retry";

describe("withRetry", () => {
  it("runs fn once when retries is 0", async () => {
    let calls = 0;

    const value = await withRetry({
      fn: () => {
        calls += 1;
        return Promise.resolve("once");
      },
      retries: 0,
      retryDelayMs: () => {
        throw new Error("delay should not be calculated");
      },
    });

    expect(value).toBe("once");
    expect(calls).toBe(1);
  });

  it("retries until fn fulfills and reports 1-indexed retry counts", async () => {
    const retryCounts: number[] = [];
    let calls = 0;

    const value = await withRetry({
      fn: () => {
        calls += 1;
        if (calls < 3) {
          return Promise.reject(new Error("not yet"));
        }
        return Promise.resolve("third");
      },
      retries: 2,
      retryDelayMs: (retryCount) => {
        retryCounts.push(retryCount);
        return 0;
      },
    });

    expect(value).toBe("third");
    expect(calls).toBe(3);
    expect(retryCounts).toEqual([1, 2]);
  });

  it("does not start another attempt when the outer signal aborts during the delay", async () => {
    const outer = new AbortController();
    let calls = 0;

    const result = withRetry({
      abortSignal: outer.signal,
      fn: () => {
        calls += 1;
        return Promise.reject(new Error("fail"));
      },
      retries: 2,
      retryDelayMs: 50,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    outer.abort("stopped");

    await expect(result).rejects.toBe("stopped");
    expect(calls).toBe(1);
  });

  it("rejects with the same error after the last attempt", async () => {
    const failure = new Error("final");

    const result = withRetry({
      fn: () => Promise.reject(failure),
      retries: 1,
      retryDelayMs: 0,
    });

    await expect(result).rejects.toBe(failure);
  });
});
