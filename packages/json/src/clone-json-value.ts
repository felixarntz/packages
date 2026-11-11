import type { JsonValue } from "./json-value";

export function cloneJsonValue(value: JsonValue): JsonValue {
  const cloned = cloneJson({ ancestors: new WeakSet(), value });
  if (cloned === undefined) {
    throw new TypeError("Value cannot be cloned as a JsonValue.");
  }
  return cloned;
}

function cloneJson(input: {
  value?: JsonValue;
  ancestors: WeakSet<object>;
}): JsonValue | undefined {
  const { value, ancestors } = input;
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (ancestors.has(value)) {
    throw new TypeError("Circular values cannot be cloned as a JsonValue.");
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const cloned = cloneJson({ ancestors, value: item });
        if (cloned === undefined) {
          throw new TypeError("Value cannot be cloned as a JsonValue.");
        }
        return cloned;
      });
    }

    const result: Record<string, JsonValue | undefined> = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneJson({ ancestors, value: item });
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}
