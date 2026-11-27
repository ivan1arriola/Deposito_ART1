export function compareOptionalOrder(a: number | null | undefined, b: number | null | undefined) {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
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
