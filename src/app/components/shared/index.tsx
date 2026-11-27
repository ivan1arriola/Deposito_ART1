"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

export { toast } from "sonner";
export { ActionMenu } from "./ActionMenu";
export { Card, Badge } from "./Cards";
export { LoadingInline, LoadingOverlay } from "./LoadingSpinner";

export function SmallActionButton(props: {
  text: string;
  tone: "edit" | "delete" | "ok" | "neutral";
  onClick: () => void;
  className?: string;
  icon?: "edit" | "trash" | "check" | "x";
}) {
  const toneClass = {
    edit: "text-[var(--color-ejercito-white)] border-[#002f70] bg-[linear-gradient(180deg,rgba(0,56,133,0.98)_0%,rgba(0,42,102,0.98)_100%)] hover:bg-[linear-gradient(180deg,rgba(0,47,112,0.98)_0%,rgba(0,36,86,0.98)_100%)]",
    delete:
      "text-[var(--color-ejercito-white)] border-[rgba(94,26,21,0.95)] bg-[linear-gradient(180deg,rgba(149,46,36,0.98)_0%,rgba(107,31,24,0.98)_100%)] hover:bg-[linear-gradient(180deg,rgba(127,38,30,0.98)_0%,rgba(88,24,18,0.98)_100%)]",
    ok: "text-[var(--color-ejercito-white)] border-[#184f1f] bg-[linear-gradient(180deg,rgba(31,103,40,0.98)_0%,rgba(22,76,30,0.98)_100%)] hover:bg-[linear-gradient(180deg,rgba(25,85,34,0.98)_0%,rgba(18,60,24,0.98)_100%)]",
    neutral:
      "text-[var(--color-text-primary)] border-[rgba(95,86,61,0.34)] bg-[linear-gradient(180deg,rgba(246,243,233,0.96)_0%,rgba(231,226,210,0.94)_100%)] hover:bg-[linear-gradient(180deg,rgba(237,233,219,0.96)_0%,rgba(223,217,198,0.94)_100%)]",
  } as const;

  const getIcon = () => {
    const iconMap = {
      edit: "edit",
      delete: "trash",
      ok: "check",
      neutral: "x",
    } as const;
    const icon = props.icon || iconMap[props.tone];

    switch (icon) {
      case "edit":
        return <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "trash":
        return <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "check":
        return <Check className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "x":
        return <X className="h-4 w-4 shrink-0" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border px-3 py-1 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:border-[rgba(95,86,61,0.18)] disabled:bg-[linear-gradient(180deg,rgba(234,230,216,0.7)_0%,rgba(219,214,198,0.76)_100%)] disabled:text-[rgba(23,33,43,0.56)] ${toneClass[props.tone]} ${props.className ?? ""}`}
    >
      {getIcon()}
      <span>{props.text}</span>
    </button>
  );
}

export function PaginationControls(props: {
  page: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(props.totalItems / props.pageSize));
  const safePage = Math.max(1, Math.min(props.page, totalPages));
  const from = props.totalItems === 0 ? 0 : (safePage - 1) * props.pageSize + 1;
  const to = props.totalItems === 0 ? 0 : Math.min(safePage * props.pageSize, props.totalItems);

  return (
    <div
      className={`flex flex-col items-stretch justify-between gap-4 rounded-[10px] border border-[rgba(95,86,61,0.2)] bg-[linear-gradient(180deg,rgba(247,244,234,0.84)_0%,rgba(230,226,211,0.92)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.36)] sm:flex-row sm:items-center ${props.className ?? ""}`}
    >
      <p className="text-xs leading-normal text-[var(--color-text-secondary)]">
        Mostrando {from} a {to} de {props.totalItems} {props.itemLabel}
        {props.totalItems !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        {props.onPageSizeChange && props.pageSizeOptions ? (
          <select
            aria-label={`Elementos por página (${props.itemLabel})`}
            value={props.pageSize}
            onChange={(event) => props.onPageSizeChange?.(Number(event.target.value))}
            className="min-h-9 min-w-[120px] rounded-lg border border-[var(--color-neutral-400)] bg-[linear-gradient(180deg,rgba(250,248,240,0.96)_0%,rgba(237,233,220,0.94)_100%)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)] focus:border-[var(--color-ejercito-blue)] focus:outline-none focus:ring-2 focus:ring-[rgb(0_56_133/15%)]"
          >
            {props.pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}/página
              </option>
            ))}
          </select>
        ) : null}

        <Pagination
          page={safePage}
          count={totalPages}
          onChange={props.onPageChange}
          showFirstButton
          showLastButton
          variant="institutional"
          ariaLabel={`Paginación de ${props.itemLabel}`}
        />
      </div>
    </div>
  );
}
