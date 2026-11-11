import { describe, expect, it } from "vitest";
import { isJsonValue } from "./is-json-value";

describe("isJsonValue", () => {
  it("accepts JSON primitives, objects, and arrays", () => {
    expect(isJsonValue(null)).toBe(true);
    expect(isJsonValue("value")).toBe(true);
    expect(isJsonValue(1)).toBe(true);
    expect(isJsonValue(false)).toBe(true);
    expect(isJsonValue({ nested: [{ value: true }] })).toBe(true);
    expect(isJsonValue({ missing: undefined })).toBe(true);
  });

  it("rejects undefined, array holes, and bigint", () => {
    expect(isJsonValue(undefined)).toBe(false);
    expect(isJsonValue([undefined])).toBe(false);
    expect(isJsonValue(10n)).toBe(false);
  });

  it("treats Date and Map as empty objects", () => {
    expect(isJsonValue(new Date(0))).toBe(true);
    expect(isJsonValue(new Map())).toBe(true);
  });
});
