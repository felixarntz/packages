import { describe, expect, test as it, vi } from "vitest";
import { isSerializableValue } from "./is-serializable-value";

describe("isSerializableValue", () => {
  it.each(
    [
      null,
      undefined,
      "",
      "value",
      false,
      true,
      0,
      -0,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      10n,
      new Date(0),
      new Date(Number.NaN),
      /value/giu,
      new URL("https://example.com"),
      new URLSearchParams("key=value"),
      new ArrayBuffer(4),
      new DataView(new ArrayBuffer(4)),
      new Int8Array([1]),
      new Uint8Array([1]),
      new Uint8ClampedArray([1]),
      new Int16Array([1]),
      new Uint16Array([1]),
      new Int32Array([1]),
      new Uint32Array([1]),
      new Float32Array([1]),
      new Float64Array([1]),
      new BigInt64Array([1n]),
      new BigUint64Array([1n]),
      [],
      {},
      Object.assign(Object.create(null), { value: undefined }),
      { nested: [new Date(0), undefined, { value: 10n }] },
      new Map([[new Date(0), new Set([1, 2])]]),
      new Set([new Map([["key", [undefined, 10n]]])]),
    ].map((value) => ({ value }))
  )("accepts $value", ({ value }) => {
    expect(isSerializableValue(value)).toBe(true);
  });

  it.each(
    [
      () => undefined,
      Symbol("value"),
      new Error("value"),
      Promise.resolve("value"),
      new WeakMap(),
      new WeakSet(),
      Object.create({ value: "inherited" }),
      {
        value: () => undefined,
      },
      [Symbol("value")],
      new Map([[() => undefined, "value"]]),
      new Map([["key", () => undefined]]),
      new Set([() => undefined]),
    ].map((value) => ({ value }))
  )("rejects $value", ({ value }) => {
    expect(isSerializableValue(value)).toBe(false);
  });

  it("rejects plain-object accessors without invoking them", () => {
    const getter = vi.fn(() => "value");
    const value = Object.defineProperty({}, "value", { get: getter });

    expect(isSerializableValue(value)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects symbol keys and unsupported non-enumerable properties", () => {
    expect(isSerializableValue({ [Symbol("key")]: "value" })).toBe(false);
    expect(
      isSerializableValue(
        Object.defineProperty({}, "value", {
          enumerable: false,
          value: () => undefined,
        })
      )
    ).toBe(false);
  });

  it("does not invoke custom serialization methods", () => {
    const toJson = vi.fn(() => ({ value: "serialized" }));

    const withMethod = {
      // biome-ignore lint/style/useNamingConvention: custom serialization method name
      toJSON: toJson,
    };
    const inherited = Object.create({
      // biome-ignore lint/style/useNamingConvention: custom serialization method name
      toJSON: toJson,
    });
    expect(isSerializableValue(withMethod)).toBe(false);
    expect(isSerializableValue(inherited)).toBe(false);
    expect(toJson).not.toHaveBeenCalled();
  });

  it("rejects cycles in objects, arrays, map keys, map values, and sets", () => {
    const object: { self?: unknown } = {};
    object.self = object;
    const array: unknown[] = [];
    array.push(array);
    const mapKey = new Map<unknown, unknown>();
    mapKey.set(mapKey, "value");
    const mapValue = new Map<unknown, unknown>();
    mapValue.set("key", mapValue);
    const set = new Set<unknown>();
    set.add(set);
    const nested: { child?: Map<string, unknown[]> } = {};
    nested.child = new Map([["key", [nested]]]);

    for (const value of [object, array, mapKey, mapValue, set, nested]) {
      expect(isSerializableValue(value)).toBe(false);
    }
  });

  it("accepts repeated references that do not form cycles", () => {
    const shared = { value: [undefined, new Date(0)] };

    expect(
      isSerializableValue({
        array: [shared, shared],
        first: shared,
        map: new Map([[shared, shared]]),
        second: shared,
        set: new Set([shared]),
      })
    ).toBe(true);
  });
});
