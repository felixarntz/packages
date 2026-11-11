import type { JsonValue } from "@felixarntz/json";
import type { SerializableValue } from "./serializable-value";
import { decodeValue } from "./util/serializable-codec";

export function jsonDecodeSerializableValue(
  value: JsonValue
): SerializableValue {
  return decodeValue({ ancestors: new WeakSet(), value });
}
