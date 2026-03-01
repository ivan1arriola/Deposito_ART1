export function compareOptionalOrder(a: number | null | undefined, b: number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

export function clampCatalogPosition(position: number, total: number) {
  return Math.min(Math.max(position, 1), Math.max(total, 1));
}

export function moveCatalogId(ids: number[], targetId: number, desiredPosition: number) {
  const remaining = ids.filter((id) => id !== targetId);
  const nextIndex = clampCatalogPosition(desiredPosition, remaining.length + 1) - 1;
  remaining.splice(nextIndex, 0, targetId);
  return remaining;
}
