import { describe, expect, it } from "vitest";
import { cloneJsonValue } from "./clone-json-value";
import type { JsonValue } from "./json-value";

describe("cloneJsonValue", () => {
  it("keeps undefined object fields and does not share nested objects", () => {
    const nested = { value: 1 };
    const value = { missing: undefined, nested };

    const cloned = cloneJsonValue(value);

    expect(cloned).toEqual({ missing: undefined, nested: { value: 1 } });
    expect(cloned).not.toBe(value);
    const clonedObject = cloned as { nested: { value: number } };
    expect(clonedObject.nested).not.toBe(nested);
  });

  it("throws when the value contains a cycle", () => {
    const value: { self?: JsonValue } = {};
    value.self = value;

    expect(() => cloneJsonValue(value)).toThrow("Circular values");
  });
});
