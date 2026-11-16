import { describe, expect, it } from "vitest";
import { compose } from "./compose";
import { createWithDeadline } from "./with-deadline";
import { createWithRetry } from "./with-retry";

describe("compose", () => {
  it("stops later retries when an outer deadline aborts", async () => {
    let calls = 0;

    const run = compose([
      createWithDeadline({ deadlineMs: 40 }),
      createWithRetry({ retries: 5, retryDelayMs: 30 }),
    ]);

    const result = run({
      fn: async ({ abortSignal }) => {
        calls += 1;
        await new Promise((resolve) => {
          abortSignal.addEventListener("abort", () => resolve(undefined), {
            once: true,
          });
        });
        throw new Error("attempt ended");
      },
    });

    await expect(result).rejects.toMatchObject({ name: "TimeoutError" });
    expect(calls).toBe(1);
  });

  it("gives each attempt its own deadline when retry wraps deadline", async () => {
    let calls = 0;

    const run = compose([
      createWithRetry({ retries: 2, retryDelayMs: 0 }),
      createWithDeadline({ deadlineMs: 30 }),
    ]);

    const value = await run({
      fn: async ({ abortSignal }) => {
        calls += 1;
        if (calls === 1) {
          await new Promise((resolve) => {
            abortSignal.addEventListener("abort", () => resolve(undefined), {
              once: true,
            });
          });
          throw new Error("timed out");
        }
        return "second";
      },
    });

    expect(value).toBe("second");
    expect(calls).toBe(2);
  });

  it("rejects an empty helper list", () => {
    expect(() => compose([])).toThrow(TypeError);
  });
});
