"use client";

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function buildPaginationItems(page: number, count: number, siblingCount: number): PaginationItem[] {
  if (count <= 0) return [];
  const boundaryCount = 1;
  const totalSlots = boundaryCount * 2 + siblingCount * 2 + 3;

  if (count <= totalSlots) {
    return Array.from({ length: count }, (_, idx) => idx + 1);
  }

  const startPages = [1];
  const endPages = [count];
  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    count - boundaryCount - 1
  );

  const items: PaginationItem[] = [...startPages];

  if (siblingsStart > boundaryCount + 2) {
    items.push("ellipsis-start");
  } else if (boundaryCount + 1 < count - boundaryCount) {
    items.push(boundaryCount + 1);
  }

  for (let i = siblingsStart; i <= siblingsEnd; i += 1) {
    items.push(i);
  }

  if (siblingsEnd < count - boundaryCount - 1) {
    items.push("ellipsis-end");
  } else if (count - boundaryCount > boundaryCount) {
    items.push(count - boundaryCount);
  }

  items.push(...endPages);
  return items;
}

export type PaginationProps = {
  page: number;
  count: number;
  onChange: (page: number) => void;
  siblingCount?: number;
  showFirstButton?: boolean;
  showLastButton?: boolean;
  ariaLabel?: string;
  variant?: "institutional" | "compact";
  className?: string;
};

export function Pagination({
  page,
  count,
  onChange,
  siblingCount = 1,
  showFirstButton = false,
  showLastButton = false,
  ariaLabel = "Paginación",
  variant = "compact",
  className = "",
}: PaginationProps) {
  const safeCount = Math.max(1, count);
  const safePage = Math.max(1, Math.min(page, safeCount));
  const items = buildPaginationItems(safePage, safeCount, siblingCount);

  const baseButtonClass =
    variant === "institutional"
      ? "inline-flex min-w-8 h-8 max-[600px]:min-w-10 max-[600px]:h-10 items-center justify-center rounded-md border px-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:opacity-45"
      : "inline-flex min-w-9 h-9 max-[600px]:min-w-10 max-[600px]:h-10 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-800 disabled:pointer-events-none disabled:opacity-45";

  const idleButtonClass =
    variant === "institutional"
      ? "border-[rgba(95,86,61,0.18)] bg-[rgba(249,247,239,0.78)] text-[var(--color-text-primary)] hover:bg-[rgba(94,107,72,0.12)] hover:border-[rgba(94,107,72,0.28)]"
      : "border-stone-300 bg-white text-stone-800 hover:bg-stone-100";

  const selectedButtonClass =
    variant === "institutional"
      ? "border-[rgba(145,111,26,0.78)] text-[var(--color-ejercito-black)] shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] bg-[linear-gradient(180deg,rgba(255,210,74,0.98)_0%,rgba(214,170,38,0.98)_100%)] hover:bg-[linear-gradient(180deg,rgba(242,198,62,0.98)_0%,rgba(196,154,28,0.98)_100%)]"
      : "border-[var(--color-ejercito-blue)] bg-[var(--color-ejercito-blue)] text-white hover:bg-[#002f70]";

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1 max-[600px]:flex-nowrap">
        {showFirstButton ? (
          <li>
            <button
              type="button"
              onClick={() => onChange(1)}
              disabled={safePage <= 1}
              aria-label="Primera página"
              className={`${baseButtonClass} ${idleButtonClass}`}
            >
              <ChevronFirst className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </li>
        ) : null}

        <li>
          <button
            type="button"
            onClick={() => onChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            aria-label="Página anterior"
            className={`${baseButtonClass} ${idleButtonClass}`}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </li>

        {items.map((item) => {
          if (item === "ellipsis-start" || item === "ellipsis-end") {
            return (
              <li key={item} aria-hidden="true">
                <span className="inline-flex min-w-6 h-8 items-center justify-center text-xs font-bold text-stone-500 select-none">
                  …
                </span>
              </li>
            );
          }

          const selected = item === safePage;
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={selected ? "page" : undefined}
                aria-label={`Página ${item}${selected ? ", actual" : ""}`}
                className={`${baseButtonClass} ${selected ? selectedButtonClass : idleButtonClass}`}
              >
                {item}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={() => onChange(Math.min(safeCount, safePage + 1))}
            disabled={safePage >= safeCount}
            aria-label="Página siguiente"
            className={`${baseButtonClass} ${idleButtonClass}`}
          >
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        </li>

        {showLastButton ? (
          <li>
            <button
              type="button"
              onClick={() => onChange(safeCount)}
              disabled={safePage >= safeCount}
              aria-label="Última página"
              className={`${baseButtonClass} ${idleButtonClass}`}
            >
              <ChevronLast className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
