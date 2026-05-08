"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, Slide } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import React from "react";
import type { Personal, OficialSuboficial } from "@/types/entities";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

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

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matches: SearchResult[] = [];

    // Search in Oficiales & Suboficiales
    for (const p of oficialesSuboficiales) {
      const nom = `${p.nombre} ${p.apellido}`.toLowerCase();
      const numCi = normalizeCi(p.ci);
      if (nom.includes(q) || numCi.includes(q)) {
        matches.push({
          ci: p.ci,
          nombreCompleto: `${p.nombre} ${p.apellido}`,
          tipo: p.tipo,
          rango: p.gradoMando?.abreviacion || p.rango?.abreviacion || p.tipo,
        });
      }
    }

    // Search in Soldados (Personal)
    for (const p of personal) {
      const fullName = `${p.nombre1} ${p.nombre2 || ""} ${p.apellido1} ${p.apellido2 || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
      const numCi = normalizeCi(p.ci);
      if (fullName.includes(q) || numCi.includes(q)) {
        matches.push({
          ci: p.ci,
          nombreCompleto: `${p.nombre1} ${p.apellido1}`,
          tipo: "SOLDADO",
          rango: p.rango?.abreviacion || "Soldado",
        });
      }
    }

    // Limit to 10 results
    return matches.slice(0, 10);
  }, [query, personal, oficialesSuboficiales]);

  const handleSelect = (ci: string) => {
    onSelectPersona(ci);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "16px",
          background: "linear-gradient(180deg, rgb(248 246 238 / 98%) 0%, rgb(232 228 214 / 98%) 100%)",
          margin: "16px",
          alignSelf: "flex-start",
          mt: { xs: 2, sm: 8 }
        }
      }}
    >
      <div className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-stone-300/50 p-4">
          <svg className="h-6 w-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg font-bold text-stone-800 placeholder:text-stone-400 focus:outline-none"
            placeholder="Buscar por cédula o nombre..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-200/50 hover:text-stone-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length > 0 && results.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              <p className="text-sm font-bold">No se encontraron resultados para "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {results.map((result) => (
                <li key={result.ci}>
                  <button
                    onClick={() => handleSelect(result.ci)}
                    className="flex w-full items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-stone-100/80 focus:bg-stone-100/80 focus:outline-none"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-stone-800">{result.nombreCompleto}</p>
                      <p className="text-xs font-semibold text-stone-500">{formatUruguayanCi(result.ci)}</p>
                    </div>
                    <span className="rounded-md bg-stone-200/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                      {result.rango}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-stone-400">
              <p className="text-xs font-bold uppercase tracking-widest">Buscador de personal</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
