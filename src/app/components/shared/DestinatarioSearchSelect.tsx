"use client";

import { useId, useMemo, useState } from "react";
import { formatUruguayanCi } from "@/lib/ci";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";

export type DestinatarioOption = {
  ci: string;
  label: string;
};

type DestinatarioSearchSelectProps = {
  options: DestinatarioOption[];
  value: string;
  disabled?: boolean;
  placeholder?: string;
  inputName?: string;
  onChange: (ci: string) => void;
};

export function DestinatarioSearchSelect({
  options,
  value,
  disabled = false,
  placeholder = "Buscar por grado, apellido, nombre o CI",
  inputName,
  onChange,
}: DestinatarioSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hoveredOptionCi, setHoveredOptionCi] = useState<string | null>(null);
  const generatedId = useId().replace(/:/g, "");

  const selectedOption = useMemo(
    () => options.find((option) => option.ci === value) ?? null,
    [options, value],
  );

  const searchIndex = useMemo(
    () =>
      buildSearchIndex(options, {
        text: (option) => option.label,
        digits: (option) => option.ci,
      }),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const ranked = filterSearchIndex(searchIndex, query);
    return ranked.slice(0, 50);
  }, [query, searchIndex]);
  const showSelectedInline = selectedOption !== null && query.trim() === "";
  const resolvedInputName = inputName ?? `destinatario-search-${generatedId}`;

  return (
    <div className="relative mt-1">
      {showSelectedInline ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange("");
            setQuery("");
            setOpen(true);
          }}
          disabled={disabled}
          className="relative block w-full rounded-lg border px-3 py-2 pr-10 text-left transition-colors disabled:opacity-50"
          style={{
            borderColor: "var(--color-border-subtle)",
            background: "linear-gradient(180deg, rgb(250 248 241 / 96%) 0%, rgb(239 235 223 / 98%) 100%)",
          }}
          aria-label="Cambiar destinatario"
        >
          <p className="overflow-hidden break-words text-[1.05rem] font-medium leading-snug text-stone-800 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {selectedOption.label}
          </p>
          <p className="mt-0.5 text-sm text-stone-500">CI {formatUruguayanCi(selectedOption.ci)}</p>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-stone-600">▾</span>
        </button>
      ) : (
        <input
          type="search"
          name={resolvedInputName}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value.trim() !== "") onChange("");
          }}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      )}
      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-300 bg-white p-1 shadow-lg">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-2 text-xs text-stone-600">Sin resultados para la busqueda.</p>
          ) : (
            filteredOptions.map((option) => {
              const active = option.ci === value;
              const hovered = hoveredOptionCi === option.ci;
              return (
                <button
                  key={option.ci}
                  type="button"
                  onMouseEnter={() => setHoveredOptionCi(option.ci)}
                  onMouseLeave={() => setHoveredOptionCi((current) => (current === option.ci ? null : current))}
                  onFocus={() => setHoveredOptionCi(option.ci)}
                  onBlur={() => setHoveredOptionCi((current) => (current === option.ci ? null : current))}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(option.ci);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    active
                      ? "bg-stone-900 text-white"
                      : hovered
                        ? "bg-stone-200 text-stone-900"
                        : "text-stone-700"
                  }`}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className={`block text-xs ${active ? "text-stone-200" : "text-stone-500"}`}>CI {formatUruguayanCi(option.ci)}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
