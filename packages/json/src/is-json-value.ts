import type { JsonValue } from "./json-value";

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (typeof value === "object") {
    return Object.entries(value).every(
      ([key, item]) =>
        typeof key === "string" && (item === undefined || isJsonValue(item))
    );
  }

  return false;
}
