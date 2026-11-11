export function isRecord<T = unknown>(
  value: unknown
): value is Record<string, T> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
