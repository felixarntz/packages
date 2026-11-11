import type { JsonValue } from "@felixarntz/json";
import { describe, expect, it } from "vitest";
import { jsonDecodeSerializableValue } from "./json-decode-serializable-value";
import { jsonEncodeSerializableValue } from "./json-encode-serializable-value";
import type { SerializableValue } from "./serializable-value";

describe("jsonEncodeSerializableValue", () => {
  it("round-trips supported non-JSON values through JSON text", () => {
    const dataViewBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const value = {
      arrayBuffer: new Uint8Array([5, 6, 7]).buffer,
      bigint: 12345678901234567890n,
      dataView: new DataView(dataViewBuffer, 1, 2),
      date: new Date("2025-01-02T03:04:05.000Z"),
      invalidDate: new Date(Number.NaN),
      literalTag: {
        // biome-ignore lint/style/useNamingConvention: wire-format tag key
        __felixarntz_serializable__: "undefined",
        value: "ordinary object",
      },
      map: new Map<SerializableValue, SerializableValue>([
        ["key", new Set<SerializableValue>([undefined, 10n])],
      ]),
      nan: Number.NaN,
      negativeInfinity: Number.NEGATIVE_INFINITY,
      negativeZero: -0,
      nullPrototype: Object.assign(Object.create(null), { value: "value" }),
      positiveInfinity: Number.POSITIVE_INFINITY,
      regexp: Object.assign(/test/giu, { lastIndex: 2 }),
      set: new Set<SerializableValue>([1, "value"]),
      uint16Array: new Uint16Array([8, 9]),
      undefined,
      url: new URL("https://example.com/path?query=value"),
      urlSearchParams: new URLSearchParams("query=value&query=other"),
    } satisfies SerializableValue;

    const serialized = jsonEncodeSerializableValue(value);
    const json = JSON.stringify(serialized);

    const restored = jsonDecodeSerializableValue(JSON.parse(json) as JsonValue);
    const restoredValue = restored as typeof value;
    expect(restoredValue).toEqual({
      ...value,
      dataView: new DataView(new Uint8Array([2, 3]).buffer),
    });
    expect(Object.is(restoredValue.negativeZero, -0)).toBe(true);
    expect(Object.getPrototypeOf(restoredValue.nullPrototype)).toBe(null);
    expect(restoredValue.dataView.byteOffset).toBe(0);
  });

  it("rejects circular values and array accessors", () => {
    const circular: { self?: SerializableValue } = {};
    circular.self = circular;

    const withAccessor = [] as SerializableValue[];
    Object.defineProperty(withAccessor, "0", {
      enumerable: true,
      get: () => "value",
    });
    withAccessor.length = 1;

    expect(() => jsonEncodeSerializableValue(circular)).toThrow(
      "Circular values"
    );
    expect(() => jsonEncodeSerializableValue(withAccessor)).toThrow(
      "Accessor properties"
    );
  });
});
