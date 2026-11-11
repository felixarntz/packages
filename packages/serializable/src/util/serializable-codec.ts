import type { JsonValue } from "@felixarntz/json";
import type { SerializableValue } from "../serializable-value";
import {
  convertBase64ToUint8Array,
  convertUint8ArrayToBase64,
  isArrayBuffer,
  isUint8Array,
} from "./uint8";

const tagKey = "__felixarntz_serializable__";

type SerializableTag =
  | "undefined"
  | "bigint"
  | "number"
  | "date"
  | "regexp"
  | "url"
  | "url-search-params"
  | "array-buffer"
  | "array-buffer-view"
  | "map"
  | "set"
  | "object";

function encodeNonFiniteNumber(value: number): JsonValue {
  if (Number.isNaN(value)) {
    return "NaN";
  }
  if (value === Number.POSITIVE_INFINITY) {
    return "Infinity";
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return "-Infinity";
  }
  return "-0";
}

export function encodeValue(input: {
  value: unknown;
  ancestors: WeakSet<object>;
}): JsonValue {
  const { ancestors, value } = input;

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (Number.isFinite(value) && !Object.is(value, -0)) {
      return value;
    }
    return tag({ type: "number", value: encodeNonFiniteNumber(value) });
  }

  if (value === undefined) {
    return tag({ type: "undefined" });
  }
  if (typeof value === "bigint") {
    return tag({ type: "bigint", value: value.toString() });
  }
  if (typeof value !== "object") {
    throw new TypeError("Value cannot be represented as JSON.");
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return tag({ type: "date", value: Number.isNaN(time) ? null : time });
  }
  if (value instanceof RegExp) {
    return tag({
      type: "regexp",
      value: {
        flags: value.flags,
        lastIndex: value.lastIndex,
        source: value.source,
      },
    });
  }
  if (value instanceof URL) {
    return tag({ type: "url", value: value.href });
  }
  if (value instanceof URLSearchParams) {
    return tag({ type: "url-search-params", value: value.toString() });
  }
  if (isArrayBuffer(value)) {
    return tag({
      type: "array-buffer",
      value: convertUint8ArrayToBase64(new Uint8Array(value)),
    });
  }
  if (ArrayBuffer.isView(value)) {
    return tag({
      type: "array-buffer-view",
      value: {
        data: convertUint8ArrayToBase64(
          new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        ),
        name: getArrayBufferViewName({ value }),
      },
    });
  }

  return encodeContainer({
    ancestors,
    encode: () => encodeContainerValue({ ancestors, value }),
    value,
  });
}

function encodeContainerValue(input: {
  value: object;
  ancestors: WeakSet<object>;
}): JsonValue {
  const { ancestors, value } = input;
  if (Array.isArray(value)) {
    return encodeArray({ ancestors, value });
  }
  if (value instanceof Map) {
    return encodeMap({ ancestors, value });
  }
  if (value instanceof Set) {
    return encodeSet({ ancestors, value });
  }
  return encodePlainObject({ ancestors, value });
}

function encodeArray(input: {
  value: unknown[];
  ancestors: WeakSet<object>;
}): JsonValue {
  const { ancestors, value } = input;
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor && !("value" in descriptor)) {
      throw new TypeError("Accessor properties cannot be represented as JSON.");
    }
    return encodeValue({
      ancestors,
      value: descriptor?.value,
    });
  });
}

function encodeMap(input: {
  value: Map<unknown, unknown>;
  ancestors: WeakSet<object>;
}): JsonValue {
  const { ancestors, value } = input;
  return tag({
    type: "map",
    value: Array.from(value.entries(), ([key, entryValue]) => [
      encodeValue({ ancestors, value: key }),
      encodeValue({ ancestors, value: entryValue }),
    ]),
  });
}

function encodeSet(input: {
  value: Set<unknown>;
  ancestors: WeakSet<object>;
}): JsonValue {
  const { ancestors, value } = input;
  return tag({
    type: "set",
    value: Array.from(value.values(), (entryValue) =>
      encodeValue({ ancestors, value: entryValue })
    ),
  });
}

function encodePlainObject(input: {
  value: object;
  ancestors: WeakSet<object>;
}): JsonValue {
  const { ancestors, value } = input;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Value cannot be represented as JSON.");
  }

  const entries: [string, JsonValue][] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError(
        "Symbol-keyed properties cannot be represented as JSON."
      );
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!(descriptor && "value" in descriptor)) {
      throw new TypeError("Accessor properties cannot be represented as JSON.");
    }
    entries.push([key, encodeValue({ ancestors, value: descriptor.value })]);
  }

  if (prototype === null || entries.some(([key]) => key === tagKey)) {
    return tag({
      type: "object",
      value: {
        entries,
        nullPrototype: prototype === null,
      },
    });
  }

  const object: Record<string, JsonValue> = Object.create(null);
  for (const [key, entryValue] of entries) {
    object[key] = entryValue;
  }
  return object;
}

export function decodeValue(input: {
  value?: JsonValue;
  ancestors: WeakSet<object>;
}): SerializableValue {
  const { ancestors, value } = input;

  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    return value;
  }

  return decodeContainer({ ancestors, value });
}

function decodeContainer(input: {
  value?: JsonValue;
  ancestors: WeakSet<object>;
}): SerializableValue {
  const { ancestors, value } = input;
  if (value === null || typeof value !== "object") {
    return value;
  }

  return withAncestor({
    ancestors,
    callback: () => {
      if (Array.isArray(value)) {
        return value.map((item) => decodeValue({ ancestors, value: item }));
      }

      if (Object.hasOwn(value, tagKey)) {
        return decodeTag({
          ancestors,
          value: value as Record<string, JsonValue>,
        });
      }

      const result: Record<string, SerializableValue> = Object.create(null);
      for (const [key, item] of Object.entries(value)) {
        Object.defineProperty(result, key, {
          configurable: true,
          enumerable: true,
          value: decodeValue({ ancestors, value: item }),
          writable: true,
        });
      }
      return result;
    },
    value,
  });
}

const invalidTag = Symbol("invalid-tag");

function decodeTag(input: {
  value: Record<string, JsonValue>;
  ancestors: WeakSet<object>;
}): SerializableValue {
  const { ancestors, value } = input;
  const type = value[tagKey];
  const payload = value["value"];
  const decoded = [
    decodeScalarTag({ payload, type }),
    decodeTextTag({ payload, type }),
    decodeCollectionTag({ ancestors, payload, type }),
  ];
  const match = decoded.find(
    (item): item is SerializableValue => item !== invalidTag
  );
  if (match === undefined && decoded.every((item) => item === invalidTag)) {
    throw new TypeError("Invalid serialized SerializableValue.");
  }
  return match;
}

function decodeScalarTag(input: {
  type?: JsonValue;
  payload?: JsonValue;
}): SerializableValue | typeof invalidTag {
  const { payload, type } = input;
  switch (type) {
    case "undefined":
      return undefined;
    case "bigint":
      if (typeof payload !== "string") {
        break;
      }
      return BigInt(payload);
    case "number":
      if (payload === "NaN") {
        return Number.NaN;
      }
      if (payload === "Infinity") {
        return Number.POSITIVE_INFINITY;
      }
      if (payload === "-Infinity") {
        return Number.NEGATIVE_INFINITY;
      }
      if (payload === "-0") {
        return -0;
      }
      break;
    case "date":
      if (payload === null) {
        return new Date(Number.NaN);
      }
      if (typeof payload === "number") {
        return new Date(payload);
      }
      break;
    default:
      break;
  }
  return invalidTag;
}

function decodeTextTag(input: {
  type?: JsonValue;
  payload?: JsonValue;
}): SerializableValue | typeof invalidTag {
  const { payload, type } = input;
  switch (type) {
    case "regexp":
      if (
        isJsonRecord(payload) &&
        typeof payload["source"] === "string" &&
        typeof payload["flags"] === "string" &&
        typeof payload["lastIndex"] === "number"
      ) {
        const regexp = new RegExp(payload["source"], payload["flags"]);
        regexp.lastIndex = payload["lastIndex"];
        return regexp;
      }
      break;
    case "url":
      if (typeof payload === "string") {
        return new URL(payload);
      }
      break;
    case "url-search-params":
      if (typeof payload === "string") {
        return new URLSearchParams(payload);
      }
      break;
    case "array-buffer":
      if (typeof payload === "string") {
        const bytes = convertBase64ToUint8Array(payload);
        return bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        );
      }
      break;
    case "array-buffer-view":
      if (
        isJsonRecord(payload) &&
        typeof payload["name"] === "string" &&
        typeof payload["data"] === "string"
      ) {
        return createArrayBufferView({
          bytes: convertBase64ToUint8Array(payload["data"]),
          name: payload["name"],
        });
      }
      break;
    default:
      break;
  }
  return invalidTag;
}

function decodeCollectionTag(input: {
  type?: JsonValue;
  payload?: JsonValue;
  ancestors: WeakSet<object>;
}): SerializableValue | typeof invalidTag {
  const { ancestors, payload, type } = input;
  switch (type) {
    case "map":
      if (Array.isArray(payload)) {
        return new Map(
          payload.map((entry) => {
            if (!Array.isArray(entry) || entry.length !== 2) {
              throw new TypeError("Invalid serialized Map entry.");
            }
            return [
              decodeValue({ ancestors, value: entry[0] }),
              decodeValue({ ancestors, value: entry[1] }),
            ];
          })
        );
      }
      break;
    case "set":
      if (Array.isArray(payload)) {
        return new Set(
          payload.map((item) => decodeValue({ ancestors, value: item }))
        );
      }
      break;
    case "object":
      if (
        isJsonRecord(payload) &&
        typeof payload["nullPrototype"] === "boolean" &&
        Array.isArray(payload["entries"])
      ) {
        const result = Object.create(
          payload["nullPrototype"] ? null : Object.prototype
        ) as Record<string, SerializableValue>;
        for (const entry of payload["entries"]) {
          if (
            !Array.isArray(entry) ||
            entry.length !== 2 ||
            typeof entry[0] !== "string"
          ) {
            throw new TypeError("Invalid serialized object entry.");
          }
          Object.defineProperty(result, entry[0], {
            configurable: true,
            enumerable: true,
            value: decodeValue({ ancestors, value: entry[1] }),
            writable: true,
          });
        }
        return result;
      }
      break;
    default:
      break;
  }

  return invalidTag;
}

export function cloneValue(input: {
  value: SerializableValue;
  clones: WeakMap<object, object>;
}): SerializableValue {
  const { clones, value } = input;
  if (value === null || typeof value !== "object") {
    return value;
  }

  const existing = clones.get(value);
  if (existing) {
    return existing as SerializableValue;
  }

  const known = cloneKnownObject({ clones, value });
  if (known !== undefined) {
    return known;
  }

  return cloneContainer({ clones, value });
}

function cloneKnownObject(input: {
  value: object;
  clones: WeakMap<object, object>;
}): SerializableValue | undefined {
  const { clones, value } = input;
  if (value instanceof Date) {
    const clone = new Date(value);
    clones.set(value, clone);
    return clone;
  }
  if (value instanceof RegExp) {
    const clone = new RegExp(value.source, value.flags);
    clone.lastIndex = value.lastIndex;
    clones.set(value, clone);
    return clone;
  }
  if (value instanceof URL) {
    const clone = new URL(value.href);
    clones.set(value, clone);
    return clone;
  }
  if (value instanceof URLSearchParams) {
    const clone = new URLSearchParams(value);
    clones.set(value, clone);
    return clone;
  }
  if (isArrayBuffer(value)) {
    const clone = value.slice(0);
    clones.set(value, clone);
    return clone;
  }
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength
    ).slice();
    const clone = createArrayBufferView({
      bytes,
      name: getArrayBufferViewName({ value }),
    });
    clones.set(value, clone);
    return clone;
  }

  return undefined;
}

function cloneContainer(input: {
  value: object;
  clones: WeakMap<object, object>;
}): SerializableValue {
  const { clones, value } = input;
  if (Array.isArray(value)) {
    return cloneArray({ clones, value });
  }
  if (value instanceof Map) {
    return cloneMap({ clones, value });
  }
  if (value instanceof Set) {
    return cloneSet({ clones, value });
  }
  return clonePlainObject({ clones, value });
}

function cloneArray(input: {
  value: unknown[];
  clones: WeakMap<object, object>;
}): SerializableValue {
  const { clones, value } = input;
  const clone = new Array<SerializableValue>(value.length);
  clones.set(value, clone);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor) {
      continue;
    }
    if (!("value" in descriptor)) {
      throw new TypeError("Accessor properties cannot be cloned.");
    }
    Object.defineProperty(clone, String(index), {
      ...descriptor,
      value: cloneValue({ clones, value: descriptor.value }),
    });
  }
  return clone;
}

function cloneMap(input: {
  value: Map<SerializableValue, SerializableValue>;
  clones: WeakMap<object, object>;
}): SerializableValue {
  const { clones, value } = input;
  const clone = new Map<SerializableValue, SerializableValue>();
  clones.set(value, clone);
  for (const [key, item] of value) {
    clone.set(
      cloneValue({ clones, value: key }),
      cloneValue({ clones, value: item })
    );
  }
  return clone;
}

function cloneSet(input: {
  value: Set<SerializableValue>;
  clones: WeakMap<object, object>;
}): SerializableValue {
  const { clones, value } = input;
  const clone = new Set<SerializableValue>();
  clones.set(value, clone);
  for (const item of value) {
    clone.add(cloneValue({ clones, value: item }));
  }
  return clone;
}

function clonePlainObject(input: {
  value: object;
  clones: WeakMap<object, object>;
}): SerializableValue {
  const { clones, value } = input;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Value cannot be cloned as a SerializableValue.");
  }

  const clone = Object.create(prototype) as Record<string, SerializableValue>;
  clones.set(value, clone);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError("Symbol-keyed properties cannot be cloned.");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!(descriptor && "value" in descriptor)) {
      throw new TypeError("Accessor properties cannot be cloned.");
    }
    Object.defineProperty(clone, key, {
      ...descriptor,
      value: cloneValue({ clones, value: descriptor.value }),
    });
  }
  return clone;
}

function encodeContainer(input: {
  value: object;
  ancestors: WeakSet<object>;
  encode: () => JsonValue;
}): JsonValue {
  return withAncestor({
    ancestors: input.ancestors,
    callback: input.encode,
    value: input.value,
  });
}

function withAncestor<T>(input: {
  value: object;
  ancestors: WeakSet<object>;
  callback: () => T;
}): T {
  if (input.ancestors.has(input.value)) {
    throw new TypeError("Circular values cannot be represented as JSON.");
  }
  input.ancestors.add(input.value);
  try {
    return input.callback();
  } finally {
    input.ancestors.delete(input.value);
  }
}

function tag(input: { type: SerializableTag; value?: JsonValue }): JsonValue {
  const result: Record<string, JsonValue> = Object.create(null);
  result[tagKey] = input.type;
  if (input.value !== undefined) {
    result["value"] = input.value;
  }
  return result;
}

function isJsonRecord(
  value: JsonValue | undefined
): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getArrayBufferViewName(input: { value: ArrayBufferView }): string {
  if (isUint8Array(input.value)) {
    return "Uint8Array";
  }
  const prototype = Object.getPrototypeOf(input.value) as {
    constructor?: { name?: unknown };
  } | null;
  const name = prototype?.constructor?.name;
  if (
    typeof name === "string" &&
    [
      "BigInt64Array",
      "BigUint64Array",
      "DataView",
      "Float32Array",
      "Float64Array",
      "Int8Array",
      "Int16Array",
      "Int32Array",
      "Uint8ClampedArray",
      "Uint16Array",
      "Uint32Array",
    ].includes(name)
  ) {
    return name;
  }
  throw new TypeError("Unsupported ArrayBufferView type.");
}

function createArrayBufferView(input: {
  name: string;
  bytes: Uint8Array;
}): ArrayBufferView {
  const buffer = input.bytes.buffer.slice(
    input.bytes.byteOffset,
    input.bytes.byteOffset + input.bytes.byteLength
  );
  switch (input.name) {
    case "DataView":
      return new DataView(buffer);
    case "Int8Array":
      return new Int8Array(buffer);
    case "Uint8Array":
      return new Uint8Array(buffer);
    case "Uint8ClampedArray":
      return new Uint8ClampedArray(buffer);
    case "Int16Array":
      return new Int16Array(buffer);
    case "Uint16Array":
      return new Uint16Array(buffer);
    case "Int32Array":
      return new Int32Array(buffer);
    case "Uint32Array":
      return new Uint32Array(buffer);
    case "Float32Array":
      return new Float32Array(buffer);
    case "Float64Array":
      return new Float64Array(buffer);
    case "BigInt64Array":
      return new BigInt64Array(buffer);
    case "BigUint64Array":
      return new BigUint64Array(buffer);
    default:
      throw new TypeError("Unsupported ArrayBufferView type.");
  }
}
