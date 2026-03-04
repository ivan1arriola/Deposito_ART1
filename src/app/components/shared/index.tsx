"use client";

import type { ReactNode } from "react";

export { toast } from "sonner";
export { ActionMenu } from "./ActionMenu";
export type { ActionMenuItem } from "./ActionMenu";
export { ConfirmDialog } from "./ConfirmDialog";
export { Input, Select, Textarea } from "./FormInputs";
export { Card, CardHeader, StatCard, EmptyState, Badge } from "./Cards";

export function CatalogCard(props: {
  title: string;
  placeholder: string;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onCreate: () => void;
  createDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="ej-card rounded-2xl p-4">
      <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">{props.title}</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={props.newValue}
          onChange={(event) => props.onNewValueChange(event.target.value)}
          placeholder={props.placeholder}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={props.onCreate}
          disabled={props.createDisabled}
          className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Crear
        </button>
      </div>
      <div className="mt-3 space-y-2">{props.children}</div>
    </article>
  );
}

export function SmallActionButton(props: {
  text: string;
  tone: "edit" | "delete" | "ok" | "neutral";
  onClick: () => void;
  className?: string;
  icon?: "edit" | "trash" | "check" | "x";
}) {
  const colorClasses = {
    edit: "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200",
    delete: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200",
    ok: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200",
    neutral: "border border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200 active:bg-stone-300",
  };

  const getIconSvg = () => {
    const iconMap = {
      edit: "edit",
      delete: "trash",
      ok: "check",
      neutral: "x",
    } as const;
    const icon = props.icon || iconMap[props.tone];
    const iconProps = "h-3.5 w-3.5";

    switch (icon) {
      case "edit":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case "trash":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case "check":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "x":
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 ${colorClasses[props.tone]} ${props.className ?? ""}`}
    >
      {getIconSvg()}
      {props.text}
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
    <div className={`flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-3 sm:flex-row sm:items-center sm:justify-between ${props.className ?? ""}`}>
      <div className="text-xs leading-5 text-stone-600">
        Mostrando {from} a {to} de {props.totalItems} {props.itemLabel}
        {props.totalItems !== 1 ? "s" : ""}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {props.onPageSizeChange && props.pageSizeOptions ? (
          <select
            value={props.pageSize}
            onChange={(event) => props.onPageSizeChange?.(Number(event.target.value))}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs sm:w-auto"
          >
            {props.pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}/pagina
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={() => props.onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50"
        >
          Anterior
        </button>

        <div className="flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-2">
          <span className="text-xs font-medium text-stone-700">Pagina {safePage}</span>
          <span className="text-xs text-stone-500">de {totalPages}</span>
        </div>

        <button
          type="button"
          onClick={() => props.onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
