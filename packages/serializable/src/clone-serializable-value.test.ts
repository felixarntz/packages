import { describe, expect, it } from "vitest";
import { cloneSerializableValue } from "./clone-serializable-value";
import type { SerializableValue } from "./serializable-value";

describe("cloneSerializableValue", () => {
  it("clones supported values without sharing mutable nested values", () => {
    const value: SerializableValue = {
      bytes: new Uint8Array([1, 2, 3]),
      map: new Map<SerializableValue, SerializableValue>([
        ["key", new Set<SerializableValue>([1])],
      ]),
    };

    const clone = cloneSerializableValue(value) as typeof value;
    (clone["bytes"] as Uint8Array)[0] = 9;
    (
      (clone["map"] as Map<SerializableValue, SerializableValue>).get(
        "key"
      ) as Set<SerializableValue>
    ).add(2);

    expect((value["bytes"] as Uint8Array)[0]).toBe(1);
    expect(
      Array.from(
        (value["map"] as Map<SerializableValue, SerializableValue>).get(
          "key"
        ) as Set<SerializableValue>
      )
    ).toEqual([1]);
  });

  it("rejects array accessors", () => {
    const withAccessor = [] as SerializableValue[];
    Object.defineProperty(withAccessor, "0", {
      enumerable: true,
      get: () => "value",
    });
    withAccessor.length = 1;

    expect(() => cloneSerializableValue(withAccessor)).toThrow(
      "Accessor properties"
    );
  });
});
