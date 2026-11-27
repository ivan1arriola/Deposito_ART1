"use client";

import { useEffect, useMemo, useState } from "react";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import type { HojaMatrixData } from "@/types/views";
import { LoadingInline, Card, Badge } from "@/app/components/shared";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import CorporateFareRoundedIcon from "@mui/icons-material/CorporateFareRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { Box, Button, Stack, Typography, useTheme, alpha } from "@mui/material";

const SIN_BATERIA_LABEL = "Sin batería";

export interface HojaMatrixViewProps {
  data: HojaMatrixData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}

export function HojaMatrixView({ data, loading, error, onReload }: HojaMatrixViewProps) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<"all" | "battery">("all");
  const [selectedBattery, setSelectedBattery] = useState<string | null>(null);
  const [previewRequested, setPreviewRequested] = useState(false);
  const subtitle = viewMode === "all" ? "Vista unificada de toda la unidad" : "Vista filtrada por subunidad operativa";
  
  useEffect(() => {
    if (!data && !loading) {
      onReload();
    }
  }, [data, loading, onReload]);

  const bateriaOptions = useMemo(() => {
    if (!data) return [] as string[];
    const labels = new Map<string, number | null>();
    for (const row of data.rows) {
      const label = row.bateria ?? SIN_BATERIA_LABEL;
      const current = labels.get(label);
      if (current === undefined || compareOptionalOrder(row.bateriaOrden, current) < 0) {
        labels.set(label, row.bateriaOrden);
      }
    }
    return Array.from(labels.entries())
      .sort((a, b) => {
        const byOrder = compareOptionalOrder(a[1], b[1]);
        if (byOrder !== 0) return byOrder;
        return a[0].localeCompare(b[0], "es", { sensitivity: "base" });
      })
      .map(([label]) => label);
  }, [data]);

  const previewHref = (() => {
    const params = new URLSearchParams();
    if (viewMode === "battery" && selectedBattery) {
      params.set("bateria", selectedBattery);
    }
    const query = params.toString();
    return query ? `/hoja-matriz?${query}` : "/hoja-matriz";
  })();

  const printHref = (() => {
    const params = new URLSearchParams();
    params.set("autoprint", "1");
    if (viewMode === "battery" && selectedBattery) {
      params.set("bateria", selectedBattery);
    }
    return `/hoja-matriz?${params.toString()}`;
  })();

  const spreadsheetHref = (() => {
    const params = new URLSearchParams();
    if (viewMode === "battery" && selectedBattery) {
      params.set("bateria", selectedBattery);
    }
    const query = params.toString();
    return query ? `/api/hoja-matrix/planilla?${query}` : "/api/hoja-matrix/planilla";
  })();

  const printDisabled = viewMode === "battery" && !selectedBattery;
  const previewDisabled = printDisabled || !data;

  return (
    <Box sx={{ mt: 3 }}>
      <Card padding="none" variant="elevated" sx={{ overflow: "hidden", background: "linear-gradient(180deg, #ffffff 0%, #f9f8f4 100%)" }}>
        <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "var(--color-ejercito-black)", letterSpacing: "-0.02em" }}>
                  Hoja Matriz General de Entrega
                </Typography>
                {data && (
                  <Badge variant="success" size="sm">
                    {viewMode === "all" ? "Unidad Completa" : selectedBattery || "Pendiente Selección"}
                  </Badge>
                )}
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary", fontWeight: 500 }}>
                {subtitle} • Ordenado por grado, batería y apellidos.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1 }}>
              <Button
                variant="contained"
                disableElevation
                onClick={() => setPreviewRequested(true)}
                disabled={previewDisabled}
                startIcon={<VisibilityRoundedIcon />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 800,
                  bgcolor: "var(--color-ejercito-black)",
                  px: 2.5,
                  "&:hover": { bgcolor: "#1a1a1a" },
                  "&.Mui-disabled": { bgcolor: alpha("#000", 0.1) }
                }}
              >
                {loading ? "Cargando..." : "Vista Previa"}
              </Button>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => window.open(printHref, "_blank", "noopener,noreferrer")}
                  disabled={printDisabled}
                  startIcon={<PictureAsPdfRoundedIcon />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    borderColor: alpha("#002f70", 0.2),
                    color: "#002f70",
                    "&:hover": { borderColor: "#002f70", bgcolor: alpha("#002f70", 0.04) }
                  }}
                  title="Imprimir / Guardar PDF"
                >
                  PDF
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.open(spreadsheetHref, "_blank", "noopener,noreferrer")}
                  disabled={printDisabled}
                  startIcon={<TableChartRoundedIcon />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    borderColor: alpha("#184f1f", 0.2),
                    color: "#184f1f",
                    "&:hover": { borderColor: "#184f1f", bgcolor: alpha("#184f1f", 0.04) }
                  }}
                  title="Descargar Planilla"
                >
                  Excel
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#2d3421", position: "relative", "&::before": { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "1px", bgcolor: "rgba(255,255,255,0.1)" } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", display: "block", mb: 1.5 }}>
                Selección de Alcance
              </Typography>
              <Stack direction="row" spacing={1} sx={{ p: 0.75, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 3, width: "fit-content", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Button
                  onClick={() => {
                    setViewMode("all");
                    setSelectedBattery(null);
                    setPreviewRequested(false);
                  }}
                  startIcon={<CorporateFareRoundedIcon />}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    ...(viewMode === "all"
                      ? { bgcolor: "#d4aa26", color: "black", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", "&:hover": { bgcolor: "#e5bb37" } }
                      : { color: "rgba(255,255,255,0.7)", "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "white" } }),
                  }}
                >
                  Toda la Unidad
                </Button>
                <Button
                  onClick={() => {
                    setViewMode("battery");
                    setPreviewRequested(false);
                  }}
                  startIcon={<GroupsRoundedIcon />}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    ...(viewMode === "battery"
                      ? { bgcolor: "#d4aa26", color: "black", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", "&:hover": { bgcolor: "#e5bb37" } }
                      : { color: "rgba(255,255,255,0.7)", "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "white" } }),
                  }}
                >
                  Por Batería
                </Button>
              </Stack>
            </Box>

            {viewMode === "battery" && (
              <Box sx={{ animation: "fadeIn 0.3s ease-out", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(-10px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", display: "block", mb: 1.5 }}>
                  Baterías Disponibles
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1.5 }}>
                  {bateriaOptions.length === 0 ? (
                    <Typography variant="body2" sx={{ fontStyle: "italic", color: "rgba(255,255,255,0.3)", py: 1 }}>
                      No se detectaron subunidades en los datos actuales.
                    </Typography>
                  ) : (
                    bateriaOptions.map((label) => (
                      <Button
                        key={label}
                        onClick={() => {
                          setSelectedBattery(label);
                          setPreviewRequested(false);
                        }}
                        sx={{
                          borderRadius: 2,
                          px: 2.5,
                          py: 1,
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8125rem",
                          border: "1px solid",
                          transition: "all 0.2s ease",
                          ...(selectedBattery === label
                            ? { bgcolor: "rgba(212, 170, 38, 0.15)", borderColor: "#d4aa26", color: "#d4aa26", boxShadow: "0 0 15px rgba(212, 170, 38, 0.1)" }
                            : { bgcolor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", "&:hover": { borderColor: "rgba(255,255,255,0.4)", color: "white", bgcolor: "rgba(255,255,255,0.05)" } }),
                        }}
                      >
                        {label}
                      </Button>
                    ))
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>

        {error && (
          <Box sx={{ p: 2, mx: 3, mb: 3, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08), border: "1px solid", borderColor: alpha(theme.palette.error.main, 0.2) }}>
            <Typography variant="body2" sx={{ color: theme.palette.error.main, fontWeight: 600 }}>{error}</Typography>
          </Box>
        )}

        {loading && !data && (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <LoadingInline label="Procesando datos de la unidad..." textClassName="font-bold text-stone-600" />
          </Box>
        )}

        {data && previewRequested ? (
          <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: "stone.200", borderTop: "1px solid", borderColor: "divider" }}>
            <Box sx={{ overflow: "hidden", borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "white", boxShadow: theme.shadows[2] }}>
              <iframe
                key={previewHref}
                title={viewMode === "all" ? "Vista previa unidad" : "Vista previa batería"}
                src={previewHref}
                style={{ width: "100%", height: "80vh", minHeight: "800px", border: "none" }}
              />
            </Box>
          </Box>
        ) : data && (
          <Box sx={{ p: 3, textAlign: "center", borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              La vista previa está lista. Presione el botón <Box component="span" sx={{ color: "text.primary" }}>&quot;Vista Previa&quot;</Box> para visualizar la matriz.
            </Typography>
          </Box>
        )}

        {data && (
          <Box sx={{ p: 2, bgcolor: alpha(theme.palette.action.hover, 0.2), borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.disabled" }}>
              Última actualización: {formatDateTimeForDisplay(data.generatedAt)}
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
