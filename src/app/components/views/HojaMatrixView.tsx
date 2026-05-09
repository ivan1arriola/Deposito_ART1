"use client";

import { useMemo, useState } from "react";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import type { HojaMatrixData } from "@/types/views";
import { LoadingInline, Card, CardHeader, Badge } from "@/app/components/shared";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import CorporateFareRoundedIcon from "@mui/icons-material/CorporateFareRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { Box, Button, Stack, Typography, useTheme, alpha } from "@mui/material";

export interface HojaMatrixViewProps {
  data: HojaMatrixData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}

export function HojaMatrixView({ data, loading, error, onReload }: HojaMatrixViewProps) {
  const [viewMode, setViewMode] = useState<"all" | "battery">("all");
  const [selectedBattery, setSelectedBattery] = useState<string | null>(null);
  const [previewRequested, setPreviewRequested] = useState(false);
  const theme = useTheme();
  
  const title = viewMode === "all" ? "Hoja Matriz de Subalternos" : "Hoja Matriz por Batería";
  const subtitle = viewMode === "all" ? "Vista unificada de toda la unidad" : "Vista filtrada por subunidad operativa";

  const bateriaOptions = useMemo(() => {
    if (!data) return [] as string[];
    const labels = new Map<string, number | null>();
    for (const row of data.rows) {
      const label = row.bateria ?? "Sin bateria";
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

  const handleLoad = async () => {
    setPreviewRequested(false);
    await onReload();
  };

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
                  {title}
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

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              <Button
                variant="contained"
                disableElevation
                onClick={handleLoad}
                disabled={loading}
                startIcon={<RefreshRoundedIcon />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  bgcolor: "var(--color-ejercito-black)",
                  "&:hover": { bgcolor: "#1a1a1a" },
                }}
              >
                {loading ? "Cargando..." : data ? "Actualizar" : "Cargar Matriz"}
              </Button>

              <Button
                variant="outlined"
                onClick={() => setPreviewRequested(true)}
                disabled={previewDisabled}
                startIcon={<VisibilityRoundedIcon />}
                sx={{ borderRadius: 2, fontWeight: 700, borderColor: "divider", color: "text.primary" }}
              >
                Vista Previa
              </Button>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => window.open(printHref, "_blank", "noopener,noreferrer")}
                  disabled={printDisabled}
                  startIcon={<PictureAsPdfRoundedIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, borderColor: alpha(theme.palette.primary.main, 0.3), color: theme.palette.primary.main }}
                  title="Imprimir / Guardar PDF"
                >
                  PDF
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.open(spreadsheetHref, "_blank", "noopener,noreferrer")}
                  disabled={printDisabled}
                  startIcon={<TableChartRoundedIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, borderColor: alpha(theme.palette.success.main, 0.3), color: theme.palette.success.main }}
                  title="Descargar Planilla"
                >
                  Excel
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: alpha(theme.palette.action.hover, 0.4) }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", display: "block", mb: 1.5 }}>
                Selección de Alcance
              </Typography>
              <Stack direction="row" spacing={1} sx={{ p: 0.5, bgcolor: "divider", borderRadius: 2.5, width: "fit-content" }}>
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
                    ...(viewMode === "all"
                      ? { bgcolor: "white", color: "var(--color-ejercito-black)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", "&:hover": { bgcolor: "white" } }
                      : { color: "text.secondary", "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.5) } }),
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
                    ...(viewMode === "battery"
                      ? { bgcolor: "white", color: "var(--color-ejercito-black)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", "&:hover": { bgcolor: "white" } }
                      : { color: "text.secondary", "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.5) } }),
                  }}
                >
                  Por Batería
                </Button>
              </Stack>
            </Box>

            {viewMode === "battery" && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", display: "block", mb: 1.5 }}>
                  Baterías Disponibles
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                  {bateriaOptions.length === 0 ? (
                    <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.disabled", py: 1 }}>
                      Cargue los datos para ver las subunidades.
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
                          px: 2,
                          py: 0.75,
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.8125rem",
                          border: "1px solid",
                          transition: "all 0.2s ease",
                          ...(selectedBattery === label
                            ? { bgcolor: alpha(theme.palette.primary.main, 0.1), borderColor: theme.palette.primary.main, color: theme.palette.primary.main }
                            : { bgcolor: "white", borderColor: "divider", color: "text.primary", "&:hover": { borderColor: "text.secondary", bgcolor: "white" } }),
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
