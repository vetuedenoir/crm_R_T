export function compareOrdered<T extends string | number>(a: T, b: T): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

export function trimSearch(text: string): string {
  return text.trim();
}
