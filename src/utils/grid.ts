export const EMPTY_ID = "__empty__";

export function padToEven<T extends { id: string }>(items: T[]): T[] {
  if (items.length % 2 === 0) return items;
  return [...items, { ...items[0], id: EMPTY_ID }];
}
