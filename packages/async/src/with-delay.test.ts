import { describe, expect, it } from "vitest";
import { withDelay } from "./with-delay";

describe("withDelay", () => {
  it("waits, then returns the callback value and a new signal", async () => {
    const outer = new AbortController();
    let started = false;
    let seen: AbortSignal | undefined;

    const value = await withDelay({
      abortSignal: outer.signal,
      delayMs: 20,
      fn: ({ abortSignal }) => {
        started = true;
        seen = abortSignal;
        return Promise.resolve("done");
      },
    });

    expect(started).toBe(true);
    expect(value).toBe("done");
    expect(seen).toBeInstanceOf(AbortSignal);
    expect(seen).not.toBe(outer.signal);
    expect(seen?.aborted).toBe(false);
  });

  it("does not call fn when the outer signal aborts during the wait", async () => {
    const outer = new AbortController();
    let calls = 0;

    const result = withDelay({
      abortSignal: outer.signal,
      delayMs: 100,
      fn: () => {
        calls += 1;
        return Promise.resolve("done");
      },
    });

    outer.abort("stopped");

    await expect(result).rejects.toBe("stopped");
    expect(calls).toBe(0);
  });
});
