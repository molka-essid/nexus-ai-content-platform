export function parseEnumParam<T extends string>(
  value: string | null,
  enumObj: Record<string, T>,
): T | undefined {
  if (!value) return undefined;
  return Object.values(enumObj).includes(value as T) ? (value as T) : undefined;
}
