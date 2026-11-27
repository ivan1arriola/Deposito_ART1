"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight, IdCard, Search, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import type { Personal, OficialSuboficial } from "@/types/entities";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";
import { stripDiacritics } from "@/lib/spanish-text";

type GlobalSearchModalProps = {
  open: boolean;
  onClose: () => void;
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  onSelectPersona: (ci: string) => void;
};

type SearchResult = {
  ci: string;
  nombreCompleto: string;
  tipo: "OFICIAL" | "SUBOFICIAL" | "SOLDADO";
  rango: string;
};

export function GlobalSearchModal({
  open,
  onClose,
  personal,
  oficialesSuboficiales,
  onSelectPersona,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    // Normalización: quitar tildes y pasar a minúsculas
    const normalize = (str: string) => stripDiacritics(str).toLowerCase();

    const qNormalized = normalize(q);
    const qNum = q.replace(/[^0-9]/g, "");

    const matches: SearchResult[] = [];

    // Search in Oficiales & Suboficiales
    for (const p of oficialesSuboficiales) {
      const fullName = `${p.nombre1} ${p.nombre2 || ""} ${p.apellido1} ${p.apellido2 || ""}`
        .replace(/\s+/g, " ")
        .trim();
      const fullNameNormalized = normalize(fullName);
      const numCi = normalizeCi(p.ci);

      if (fullNameNormalized.includes(qNormalized) || (qNum && numCi.includes(qNum))) {
        matches.push({
          ci: p.ci,
          nombreCompleto: `${p.nombre1} ${p.apellido1}`,
          tipo: p.tipo,
          rango: p.gradoMando?.abreviacion || p.tipo,
        });
      }
    }

    // Search in Soldados (Personal)
    for (const p of personal) {
      const fullName = `${p.nombre1} ${p.nombre2 || ""} ${p.apellido1} ${p.apellido2 || ""}`
        .replace(/\s+/g, " ")
        .trim();
      const fullNameNormalized = normalize(fullName);
      const numCi = normalizeCi(p.ci);

      if (fullNameNormalized.includes(qNormalized) || (qNum && numCi.includes(qNum))) {
        matches.push({
          ci: p.ci,
          nombreCompleto: `${p.nombre1} ${p.apellido1}`,
          tipo: "SOLDADO",
          rango: p.rango?.abreviacion || "Soldado",
        });
      }
    }

    return matches.slice(0, 8);
  }, [query, personal, oficialesSuboficiales]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleSelect = (ci: string) => {
    onSelectPersona(ci);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent
        variant="search"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Buscador de personal</DialogTitle>
        <DialogDescription className="sr-only">
          Busca personal por cédula de identidad o nombre completo para abrir su ficha.
        </DialogDescription>

        <div className="flex flex-col">
          {/* Search Input Bar */}
          <div className="flex items-center gap-4 border-b border-black/5 bg-white p-5">
            <Search
              className="h-6 w-6 shrink-0 opacity-60"
              style={{ color: "var(--color-ejercito-blue, #1a2a1a)" }}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              aria-label="Buscar por cédula o nombre"
              className="flex-1 border-0 bg-transparent text-lg font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-0"
              style={{ minHeight: "auto", background: "transparent", boxShadow: "none" }}
              placeholder="Buscar por cédula o nombre..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              aria-label="Cerrar buscador"
              onClick={handleClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              <X className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>

          {/* Results Body */}
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {query.length > 0 && results.length === 0 ? (
              <div className="py-12 text-center text-stone-500">
                <p className="text-sm font-medium">
                  No se encontraron resultados para &quot;{query}&quot;
                </p>
              </div>
            ) : results.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {results.map((result) => (
                  <li key={result.ci}>
                    <button
                      type="button"
                      onClick={() => handleSelect(result.ci)}
                      className="group flex w-full items-center gap-4 rounded-xl p-3 text-left transition-all duration-150 hover:bg-stone-100/80 active:bg-stone-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all group-hover:bg-white group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] ${
                          result.tipo === "SOLDADO"
                            ? "bg-stone-100 text-stone-500"
                            : "bg-[rgba(202,161,79,0.12)] text-[var(--color-ejercito-gold)]"
                        }`}
                      >
                        {result.tipo === "SOLDADO" ? (
                          <User className="h-5 w-5 shrink-0" aria-hidden="true" />
                        ) : (
                          <IdCard className="h-5 w-5 shrink-0" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[15px] font-bold leading-tight text-stone-800">
                            {result.nombreCompleto}
                          </p>
                          <span className="shrink-0 rounded border border-stone-200/50 bg-stone-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-500">
                            {result.rango}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
                          {formatUruguayanCi(result.ci)}
                        </p>
                      </div>

                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-stone-300 transition-colors group-hover:text-stone-500"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">
                  Buscador Inteligente
                </div>
                <p className="text-[11px] font-medium text-stone-500">
                  Empieza a escribir para buscar personal...
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between border-t border-black/5 bg-[#fcfcfc] px-6 py-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-stone-400">TAB</span>
                <span className="text-[9px] font-bold uppercase tracking-tighter text-stone-500">
                  Navegar
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-stone-400">ESC</span>
                <span className="text-[9px] font-bold uppercase tracking-tighter text-stone-500">
                  Cerrar
                </span>
              </div>
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-stone-400">
              G.A. 105mm No. 1
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
