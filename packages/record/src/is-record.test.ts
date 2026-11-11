import { describe, expect, it } from "vitest";
import { isRecord } from "./is-record";

describe("isRecord", () => {
  it("accepts plain objects and null-prototype objects", () => {
    expect(isRecord({ value: 1 })).toBe(true);
    expect(isRecord(Object.create(null))).toBe(true);
  });

  it("rejects null, arrays, and non-objects", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("value")).toBe(false);
  });

  it("accepts other non-array objects", () => {
    expect(isRecord(new Date(0))).toBe(true);
    expect(isRecord(new Map())).toBe(true);
  });
});
