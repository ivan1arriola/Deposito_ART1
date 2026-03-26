"use client";

import { useMemo, useState } from "react";
import { formatUruguayanCi } from "@/lib/ci";
import { normalizeSearchText } from "@/lib/spanish-text";

export type DestinatarioOption = {
  ci: string;
  label: string;
};

type DestinatarioSearchSelectProps = {
  options: DestinatarioOption[];
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (ci: string) => void;
};

function normalizeText(value: string) {
  return normalizeSearchText(value);
}

export function DestinatarioSearchSelect({
  options,
  value,
  disabled = false,
  placeholder = "Buscar por grado, apellido, nombre o CI",
  onChange,
}: DestinatarioSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.ci === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const queryDigits = query.replace(/\D/g, "");
    const ranked = options.filter((option) => {
      if (normalizedQuery === "" && queryDigits === "") return true;
      const matchesLabel = normalizeText(option.label).includes(normalizedQuery);
      const optionDigits = option.ci.replace(/\D/g, "");
      const matchesCi = queryDigits !== "" && optionDigits.includes(queryDigits);
      return matchesLabel || matchesCi;
    });
    return ranked.slice(0, 50);
  }, [options, query]);

  return (
    <div className="relative mt-1">
      <input
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (value.trim() !== "") onChange("");
        }}
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />

      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-300 bg-white p-1 shadow-lg">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-2 text-xs text-stone-600">Sin resultados para la busqueda.</p>
          ) : (
            filteredOptions.map((option) => {
              const active = option.ci === value;
              return (
                <button
                  key={option.ci}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(option.ci);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"
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

      {selectedOption ? (
        <p className="mt-1 text-xs text-stone-600">
          Seleccionado: <span className="font-semibold text-stone-900">{selectedOption.label}</span> | CI {formatUruguayanCi(selectedOption.ci)}
        </p>
      ) : null}
    </div>
  );
}
