export function createRecord<T = unknown>(
  initialProps?: Record<string, T>
): Record<string, T> {
  if (initialProps) {
    return Object.assign(Object.create(null), initialProps);
  }
  return Object.create(null);
}
