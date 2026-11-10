"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, Slide, Box, IconButton } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import React from "react";
import type { Personal, OficialSuboficial } from "@/types/entities";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
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
      const timer = setTimeout(() => {
        setQuery("");
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    
    // Normalización: quitar tildes y pasar a minúsculas
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      
    const qNormalized = normalize(q);
    const qNum = q.replace(/[^0-9]/g, "");

    const matches: SearchResult[] = [];

    // Search in Oficiales & Suboficiales
    for (const p of oficialesSuboficiales) {
      const fullName = `${p.nombre1} ${p.nombre2 || ""} ${p.apellido1} ${p.apellido2 || ""}`.replace(/\s+/g, " ").trim();
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
      const fullName = `${p.nombre1} ${p.nombre2 || ""} ${p.apellido1} ${p.apellido2 || ""}`.replace(/\s+/g, " ").trim();
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
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.02)",
          margin: "16px",
          alignSelf: "flex-start",
          mt: { xs: 4, sm: 10 },
          overflow: "hidden",
        }
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {/* Search Input Bar */}
        <Box 
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 2, 
            p: 2.5, 
            background: "white",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)"
          }}
        >
          <SearchRoundedIcon sx={{ color: "var(--color-ejercito-blue, #1a2a1a)", fontSize: 24, opacity: 0.6 }} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg font-semibold text-stone-800 placeholder:text-stone-400 focus:outline-none"
            placeholder="Buscar por cédula o nombre..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <IconButton 
            size="small"
            onClick={onClose}
            sx={{ 
              color: "rgba(0,0,0,0.2)",
              "&:hover": { color: "black", bgcolor: "rgba(0,0,0,0.05)" }
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Results Body */}
        <Box sx={{ maxHeight: "60vh", overflowY: "auto", p: 1.5 }}>
          {query.length > 0 && results.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: "stone.400" }}>
              <p className="text-sm font-medium">No se encontraron resultados para &quot;{query}&quot;</p>
            </Box>
          ) : results.length > 0 ? (
            <Box component="ul" sx={{ display: "flex", flexDirection: "column", gap: 0.5, listStyle: "none", m: 0, p: 0 }}>
              {results.map((result) => (
                <Box component="li" key={result.ci}>
                  <button
                    onClick={() => handleSelect(result.ci)}
                    className="group flex w-full equipos-center gap-4 rounded-xl p-3 text-left transition-all duration-150 hover:bg-stone-100/80 active:bg-stone-200/50"
                  >
                    <Box 
                      sx={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: "12px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        bgcolor: result.tipo === "SOLDADO" ? "stone.100" : "rgba(202, 161, 79, 0.1)",
                        color: result.tipo === "SOLDADO" ? "stone.400" : "var(--color-ejercito-gold)",
                        transition: "all 0.2s",
                        groupHover: { bgcolor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
                      }}
                    >
                      {result.tipo === "SOLDADO" ? <PersonRoundedIcon /> : <BadgeRoundedIcon />}
                    </Box>
                    
                    <div className="flex-1">
                      <div className="flex equipos-center justify-between">
                        <p className="text-[15px] font-bold text-stone-800 leading-tight">
                          {result.nombreCompleto}
                        </p>
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/50">
                          {result.rango}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-stone-500 mt-0.5">
                        {formatUruguayanCi(result.ci)}
                      </p>
                    </div>

                    <KeyboardArrowRightRoundedIcon sx={{ color: "stone.200", groupHover: { color: "stone.400" }, transition: "color 0.2s" }} />
                  </button>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 4, textAlign: "center", display: "flex", flexDirection: "column", itemsCenter: "center", gap: 1 }}>
               <div className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-300">
                  Buscador Inteligente
               </div>
               <p className="text-[11px] text-stone-400 font-medium">Empieza a escribir para buscar personal...</p>
            </Box>
          )}
        </Box>

        {/* Action Bar */}
        <Box 
          sx={{ 
            p: 2, 
            px: 3, 
            bgcolor: "#fcfcfc",
            borderTop: "1px solid rgba(0, 0, 0, 0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div className="flex gap-4">
             <div className="flex equipos-center gap-1.5">
                <span className="text-[10px] font-black text-stone-300">TAB</span>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Navegar</span>
             </div>
             <div className="flex equipos-center gap-1.5">
                <span className="text-[10px] font-black text-stone-300">ESC</span>
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-tighter">Cerrar</span>
             </div>
          </div>
          <div className="text-[9px] font-black text-stone-300 uppercase tracking-widest">
            G.A. 105mm No. 1
          </div>
        </Box>
      </Box>
    </Dialog>
  );
}
