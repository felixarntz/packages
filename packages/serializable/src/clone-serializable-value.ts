import type { SerializableValue } from "./serializable-value";
import { cloneValue } from "./util/serializable-codec";

export function cloneSerializableValue(
  value: SerializableValue
): SerializableValue {
  return cloneValue({ clones: new WeakMap(), value });
}
