import { describe, expect, it } from "vitest";
import { withDeadline } from "./with-deadline";

describe("withDeadline", () => {
  it("returns the callback value when it finishes first", async () => {
    const outer = new AbortController();

    const value = await withDeadline({
      abortSignal: outer.signal,
      deadlineMs: 200,
      fn: ({ abortSignal }) => {
        expect(abortSignal).not.toBe(outer.signal);
        return Promise.resolve(7);
      },
    });

    expect(value).toBe(7);
  });

  it("rejects with TimeoutError when the callback ignores the signal", async () => {
    const result = withDeadline({
      deadlineMs: 20,
      fn: async () => await new Promise(() => undefined),
    });

    await expect(result).rejects.toMatchObject({
      message: "The operation was aborted due to timeout",
      name: "TimeoutError",
    });
  });

  it("rejects with the outer reason when that signal aborts", async () => {
    const outer = new AbortController();
    let inner: AbortSignal | undefined;

    const result = withDeadline({
      abortSignal: outer.signal,
      deadlineMs: 500,
      fn: async ({ abortSignal }) => {
        inner = abortSignal;
        await new Promise((resolve) => {
          abortSignal.addEventListener("abort", () => resolve(undefined), {
            once: true,
          });
        });
        return "late";
      },
    });

    outer.abort("cancelled");

    await expect(result).rejects.toBe("cancelled");
    expect(inner).not.toBe(outer.signal);
  });
});
