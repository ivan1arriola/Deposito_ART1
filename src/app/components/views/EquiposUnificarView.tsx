"use client";

import { Box, Button, Card, CardContent, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { Equipo } from "@/types/entities";

type MergeableEquipo = Pick<Equipo, "itemId" | "nombre" | "tipo" | "activo">;

type EquiposUnificarViewProps = {
  canWrite: boolean;
  equipos: MergeableEquipo[];
  mergeEquipoOrigenId: string;
  mergeEquipoDestinoId: string;
  onMergeEquipoOrigenIdChange: (id: string) => void;
  onMergeEquipoDestinoIdChange: (id: string) => void;
  onMergeEquipos: (origenId: string, destinoId: string) => void;
};

export function EquiposUnificarView({
  canWrite,
  equipos,
  mergeEquipoOrigenId,
  mergeEquipoDestinoId,
  onMergeEquipoOrigenIdChange,
  onMergeEquipoDestinoIdChange,
  onMergeEquipos,
}: EquiposUnificarViewProps) {
  const equiposOrdenadosAlfabeticamente = [...equipos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  const mergeTargetEquipos = equiposOrdenadosAlfabeticamente.filter(
    (equipo) => equipo.itemId !== mergeEquipoOrigenId
  );

  const canMerge =
    canWrite &&
    equipos.length >= 2 &&
    mergeEquipoOrigenId.trim() !== "" &&
    mergeEquipoDestinoId.trim() !== "" &&
    mergeEquipoOrigenId !== mergeEquipoDestinoId;

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Card
        sx={{
          borderRadius: 4,
          border: "1px solid var(--color-border-subtle)",
          bgcolor: "var(--color-surface-base)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, var(--color-surface-muted) 0%, var(--color-surface-base) 100%)",
            px: 3,
            py: 3,
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CompareArrowsRoundedIcon sx={{ color: "var(--color-ejercito-brown)", fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "var(--color-text-primary)", tracking: "-0.01em" }}>
                Unificar Catálogo de Equipos
              </Typography>
              <Typography variant="caption" sx={{ color: "var(--color-text-secondary)" }}>
                Herramienta de depuración y consolidación del inventario
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* Detailed Description Callout */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: "rgba(33, 150, 243, 0.04)",
              border: "1px solid rgba(33, 150, 243, 0.16)",
              mb: 4,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <InfoOutlinedIcon sx={{ color: "#1976d2", mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1565c0", mb: 1 }}>
                  ¿Cómo funciona la unificación de equipos?
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", lineHeight: 1.6, mb: 1 }}>
                  Esta función permite resolver duplicados en el catálogo (por ejemplo, cuando se registran con nombres ligeramente distintos como &quot;Buzo verde&quot; y &quot;Buzo verde m/c&quot;).
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                  <li>
                    <strong>Traspaso de Historial:</strong> Todos los registros históricos, incluyendo entregas, devoluciones, préstamos y movimientos de stock del <em>Equipo Origen</em>, se traspasarán automáticamente al <em>Equipo Destino</em>.
                  </li>
                  <li>
                    <strong>Consolidación del Catálogo:</strong> Una vez completada la transferencia de todos los movimientos, el <em>Equipo Origen</em> se eliminará permanentemente del catálogo de forma segura sin perder la trazabilidad del personal.
                  </li>
                  <li>
                    <strong>Integridad de los Datos:</strong> El balance de stock histórico se recalcula automáticamente sumando los movimientos traspasados.
                  </li>
                </Box>
              </Box>
            </Stack>
          </Box>

          {!canWrite ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "var(--color-surface-muted)",
                border: "1px solid var(--color-border-subtle)",
                mb: 3,
              }}
            >
              <Typography variant="body2" sx={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                Modo solo lectura: Tu cuenta no posee permisos de escritura/eliminación para unificar equipos.
              </Typography>
            </Box>
          ) : null}

          {equipos.length < 2 ? (
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "rgba(255, 152, 0, 0.05)",
                border: "1px solid rgba(255, 152, 0, 0.2)",
                textAlign: "center",
              }}
            >
              <WarningAmberRoundedIcon sx={{ color: "#ff9800", fontSize: 40, mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 700, color: "#e65100", mb: 0.5 }}>
                No hay suficientes equipos
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--color-text-secondary)" }}>
                Se requieren al menos 2 equipos en el catálogo para poder realizar una fusión.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                <FormControl fullWidth size="medium">
                  <InputLabel id="merge-origen-label" sx={{ fontWeight: 600 }}>Equipo Origen (Se eliminará)</InputLabel>
                  <Select
                    labelId="merge-origen-label"
                    value={mergeEquipoOrigenId}
                    onChange={(e) => onMergeEquipoOrigenIdChange(e.target.value)}
                    disabled={!canWrite}
                    label="Equipo Origen (Se eliminará)"
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: "var(--color-surface-base)",
                      fontWeight: 600,
                    }}
                  >
                    <MenuItem value="">
                      <em>Seleccionar equipo origen</em>
                    </MenuItem>
                    {equiposOrdenadosAlfabeticamente.map((equipo) => (
                      <MenuItem key={`merge-origen-opt-${equipo.itemId}`} value={equipo.itemId} sx={{ py: 1.25 }}>
                        {equipo.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="medium">
                  <InputLabel id="merge-destino-label" sx={{ fontWeight: 600 }}>Equipo Destino (Se conservará)</InputLabel>
                  <Select
                    labelId="merge-destino-label"
                    value={mergeEquipoDestinoId}
                    onChange={(e) => onMergeEquipoDestinoIdChange(e.target.value)}
                    disabled={!canWrite || mergeEquipoOrigenId.trim() === ""}
                    label="Equipo Destino (Se conservará)"
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: "var(--color-surface-base)",
                      fontWeight: 600,
                    }}
                  >
                    <MenuItem value="">
                      <em>Seleccionar equipo destino</em>
                    </MenuItem>
                    {mergeTargetEquipos.map((equipo) => (
                      <MenuItem key={`merge-destino-opt-${equipo.itemId}`} value={equipo.itemId} sx={{ py: 1.25 }}>
                        {equipo.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Divider sx={{ borderStyle: "dashed", my: 1 }} />

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "rgba(244, 67, 54, 0.03)",
                  border: "1px solid rgba(244, 67, 54, 0.12)",
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <WarningAmberRoundedIcon sx={{ color: "error.main", fontSize: 24 }} />
                  <Typography variant="body2" sx={{ color: "error.dark", fontWeight: 600 }}>
                    Acción irreversible: Confirme detenidamente que los equipos seleccionados sean los correctos. Una vez unificados, no se podrá deshacer la fusión automática.
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  color="error"
                  disabled={!canMerge}
                  onClick={() => onMergeEquipos(mergeEquipoOrigenId, mergeEquipoDestinoId)}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    textTransform: "none",
                    boxShadow: "var(--shadow-sm)",
                    "&:hover": {
                      bgcolor: "error.dark",
                    },
                  }}
                >
                  Unificar y eliminar origen
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
