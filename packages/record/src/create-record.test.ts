import { describe, expect, it } from "vitest";
import { createRecord } from "./create-record";

describe("createRecord", () => {
  it("creates an empty null-prototype record", () => {
    const record = createRecord();

    expect(Object.getPrototypeOf(record)).toBe(null);
    expect(Object.keys(record)).toEqual([]);
  });

  it("copies the initial properties onto a null-prototype record", () => {
    const record = createRecord({ value: 1 });

    expect(Object.getPrototypeOf(record)).toBe(null);
    expect(record["value"]).toBe(1);
    expect(Object.hasOwn(record, "toString")).toBe(false);
  });
});
