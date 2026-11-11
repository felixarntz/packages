import type { JsonValue } from "@felixarntz/json";
import type { SerializableValue } from "./serializable-value";
import { encodeValue } from "./util/serializable-codec";

export function jsonEncodeSerializableValue(
  value: SerializableValue
): JsonValue {
  return encodeValue({ ancestors: new WeakSet(), value });
}
