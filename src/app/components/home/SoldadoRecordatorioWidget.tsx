"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { RecordatorioTarea } from "@/types/entities";

type RecordatorioCreateInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
};

type SoldadoRecordatorioWidgetProps = {
  tasks: RecordatorioTarea[];
  loading: boolean;
  saving: boolean;
  onCreateTask: (input: RecordatorioCreateInput) => Promise<void> | void;
  onToggleTask: (tareaId: string, completada: boolean) => Promise<void> | void;
  onOpenConfig: () => void;
};

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortPendingTasks(a: RecordatorioTarea, b: RecordatorioTarea) {
  if (a.prioridad !== b.prioridad) return a.prioridad === "URGENTE" ? -1 : 1;
  if (!a.fechaLimite && !b.fechaLimite) return 0;
  if (!a.fechaLimite) return 1;
  if (!b.fechaLimite) return -1;
  if (a.fechaLimite < b.fechaLimite) return -1;
  if (a.fechaLimite > b.fechaLimite) return 1;
  return 0;
}

function MiniSoldadoAvatar({ urgent }: { urgent: boolean }) {
  return (
    <span
      className={`soldier-avatar soldier-float relative inline-flex h-[82px] w-[82px] items-end justify-center ${
        urgent ? "soldier-urgent" : ""
      }`}
      aria-hidden="true"
    >
      <span className="soldier-shadow absolute bottom-[4px] h-[10px] w-12 rounded-full bg-black/20 blur-[2px]" />
      <span className="absolute bottom-[28px] h-9 w-9 rounded-full bg-emerald-200/15 blur-[8px]" />
      <svg viewBox="0 0 120 120" className="relative h-[76px] w-[76px] drop-shadow-[0_3px_4px_rgba(0,0,0,0.24)]">
        <g className="soldier-pack soldier-svg-part">
          <rect x="35" y="52" width="50" height="34" rx="12" fill="#5f6d49" stroke="#435236" strokeWidth="3" />
          <rect x="42" y="58" width="10" height="20" rx="3" fill="#6c7a53" />
          <rect x="68" y="58" width="10" height="20" rx="3" fill="#6c7a53" />
          <rect x="57.5" y="54" width="5" height="28" rx="2.5" fill="#3e4b31" />
        </g>

        <g className="soldier-arm-left soldier-svg-part">
          <rect x="18" y="56" width="14" height="31" rx="7" fill="#76855a" stroke="#51613b" strokeWidth="3" />
          <circle cx="25" cy="74" r="3.2" fill="#6b7a4f" />
        </g>
        <g className="soldier-arm-right soldier-svg-part">
          <rect x="88" y="56" width="14" height="31" rx="7" fill="#76855a" stroke="#51613b" strokeWidth="3" />
          <circle cx="95" cy="74" r="3.2" fill="#6b7a4f" />
        </g>
        <circle cx="26" cy="88" r="6" fill="#f0c6a3" stroke="#c89e7e" strokeWidth="2.5" />
        <circle cx="94" cy="88" r="6" fill="#f0c6a3" stroke="#c89e7e" strokeWidth="2.5" />

        <g className="soldier-torso soldier-svg-part">
          <rect x="36" y="47" width="48" height="44" rx="14" fill="#7d8a61" stroke="#51613b" strokeWidth="3" />
          <path d="M38 64 H82" stroke="#5a6842" strokeWidth="2" strokeLinecap="round" />
          <rect x="41" y="60" width="14" height="15" rx="4" fill="#6a7650" stroke="#51613b" strokeWidth="2" />
          <rect x="65" y="60" width="14" height="15" rx="4" fill="#6a7650" stroke="#51613b" strokeWidth="2" />
          <path d="M41 60 L55 60 L53 64 L43 64 Z" fill="#5e6c45" />
          <path d="M65 60 L79 60 L77 64 L67 64 Z" fill="#5e6c45" />
          <rect x="58" y="52" width="4" height="36" rx="2" fill="#4f4336" />
          <circle cx="60" cy="66" r="2.4" fill="#d9c46b" />
          <circle cx="60" cy="74" r="2.4" fill="#d9c46b" />
          <rect x="47" y="79" width="26" height="7" rx="3.5" fill="#58473b" />
          <rect x="57" y="79.8" width="6" height="5.2" rx="2" fill="#d1b763" />
        </g>

        <rect x="45" y="86" width="12" height="19" rx="6" fill="#76855a" stroke="#51613b" strokeWidth="3" className="soldier-leg-left soldier-svg-part" />
        <rect x="63" y="86" width="12" height="19" rx="6" fill="#76855a" stroke="#51613b" strokeWidth="3" className="soldier-leg-right soldier-svg-part" />
        <rect x="39" y="101" width="22" height="9" rx="4.5" fill="#2f2c29" />
        <rect x="61" y="101" width="22" height="9" rx="4.5" fill="#2f2c29" />

        <g className="soldier-head soldier-svg-part">
          <rect x="53" y="41" width="14" height="8" rx="4" fill="#e1b490" />
          <ellipse cx="60" cy="31" rx="18" ry="15" fill="#f0c6a3" stroke="#c89e7e" strokeWidth="3" />
          <circle cx="52.5" cy="30.5" r="2.4" fill="#1f2a1b" className="soldier-eye soldier-svg-part" />
          <circle cx="67.5" cy="30.5" r="2.4" fill="#1f2a1b" className="soldier-eye soldier-svg-part" />
          <path d="M49 26.7 Q52 24.8 55.3 26.7" stroke="#5b4031" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M64.7 26.7 Q68 24.8 71 26.7" stroke="#5b4031" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M53.5 37.5 Q60 42.3 66.5 37.5" fill="none" stroke="#865f4b" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M53.8 34.9 Q60 39 66.2 34.9" fill="none" stroke="#6d4938" strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="47" cy="36" rx="3.8" ry="2.2" fill="rgba(228,145,132,0.45)" />
          <ellipse cx="73" cy="36" rx="3.8" ry="2.2" fill="rgba(228,145,132,0.45)" />
        </g>

        <g className="soldier-helmet soldier-svg-part">
          <path d="M41 23 C43 13, 53 8, 60 8 C67 8, 77 13, 79 23 L79 26 L41 26 Z" fill="#66704d" stroke="#4f5839" strokeWidth="3" />
          <path d="M41 25 C52 29, 68 29, 79 25" fill="#4f5839" />
          <rect x="49" y="19" width="22" height="6" rx="3" fill="#738159" />
          <circle cx="60" cy="22" r="3" fill="#d9c46b" />
          <path className="soldier-helmet-glint" d="M45 16 L52 16 L46 26 L40 26 Z" fill="rgba(255,255,255,0.28)" />
        </g>
      </svg>
    </span>
  );
}

export function SoldadoRecordatorioWidget({
  tasks,
  loading,
  saving,
  onCreateTask,
  onToggleTask,
  onOpenConfig,
}: SoldadoRecordatorioWidgetProps) {
  const [open, setOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [prioridad, setPrioridad] = useState<"NORMAL" | "URGENTE">("NORMAL");

  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completada).sort(sortPendingTasks),
    [tasks],
  );
  const completedCount = tasks.length - pendingTasks.length;
  const todayKey = todayIsoDate();
  const urgentCount = useMemo(
    () => pendingTasks.filter((task) => task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey)).length,
    [pendingTasks, todayKey],
  );

  const visibleTasks = pendingTasks.slice(0, 4);

  const submit = async () => {
    const titleTrimmed = titulo.trim();
    if (titleTrimmed.length < 2) return;

    await onCreateTask({
      titulo: titleTrimmed,
      nota: nota.trim(),
      fechaLimite: fechaLimite.trim() === "" ? null : fechaLimite.trim(),
      prioridad,
    });

    setTitulo("");
    setNota("");
    setFechaLimite("");
    setPrioridad("NORMAL");
    setShowComposer(false);
  };

  return (
    <Box sx={{ position: "fixed", bottom: { xs: 16, md: 24 }, left: { xs: 12, md: 24 }, zIndex: 360 }}>
      <style>{`
        @keyframes soldier-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes soldier-shadow-sway {
          0%, 100% { transform: scaleX(1); opacity: 0.75; }
          50% { transform: scaleX(0.88); opacity: 0.52; }
        }

        @keyframes soldier-eye-blink {
          0%, 44%, 47%, 74%, 77%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.15); }
          76% { transform: scaleY(0.2); }
        }

        @keyframes soldier-arm-left {
          0%, 100% { transform: rotate(12deg); }
          50% { transform: rotate(21deg); }
        }

        @keyframes soldier-arm-right {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(-21deg); }
        }

        @keyframes soldier-leg-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(5deg); }
        }

        @keyframes soldier-leg-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-5deg); }
        }

        @keyframes soldier-breath {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.03); }
        }

        @keyframes soldier-head-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-0.8px) rotate(-1.1deg); }
        }

        @keyframes soldier-pack-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1deg); }
        }

        @keyframes soldier-helmet-glint {
          0%, 100% { opacity: 0; transform: translateX(-5px); }
          22% { opacity: 0; transform: translateX(-5px); }
          35% { opacity: 0.9; transform: translateX(3px); }
          45% { opacity: 0; transform: translateX(7px); }
        }

        @keyframes urgent-jitter {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1.2deg); }
          75% { transform: rotate(1.2deg); }
        }

        @keyframes urgent-pulse {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(190, 18, 60, 0)); }
          50% { filter: drop-shadow(0 0 8px rgba(190, 18, 60, 0.62)); }
        }

        .soldier-avatar {
          transform-origin: center bottom;
        }

        .soldier-svg-part {
          transform-box: fill-box;
        }

        .soldier-float {
          animation: soldier-float 2.1s ease-in-out infinite;
        }

        .soldier-shadow {
          animation: soldier-shadow-sway 2.1s ease-in-out infinite;
        }

        .soldier-eye {
          transform-origin: center center;
          animation: soldier-eye-blink 4.8s ease-in-out infinite;
        }

        .soldier-pack {
          transform-origin: center center;
          animation: soldier-pack-sway 2.1s ease-in-out infinite;
        }

        .soldier-torso {
          transform-origin: center center;
          animation: soldier-breath 2.4s ease-in-out infinite;
        }

        .soldier-head {
          transform-origin: center bottom;
          animation: soldier-head-bob 2.4s ease-in-out infinite;
        }

        .soldier-helmet {
          transform-origin: center center;
          animation: soldier-head-bob 2.4s ease-in-out infinite;
        }

        .soldier-helmet-glint {
          animation: soldier-helmet-glint 4.2s ease-in-out infinite;
        }

        .soldier-arm-left {
          transform-origin: top center;
          animation: soldier-arm-left 1.8s ease-in-out infinite;
        }

        .soldier-arm-right {
          transform-origin: top center;
          animation: soldier-arm-right 1.8s ease-in-out infinite;
        }

        .soldier-leg-left {
          transform-origin: top center;
          animation: soldier-leg-left 1.8s ease-in-out infinite;
        }

        .soldier-leg-right {
          transform-origin: top center;
          animation: soldier-leg-right 1.8s ease-in-out infinite;
        }

        .soldier-urgent {
          animation: soldier-float 2.1s ease-in-out infinite, urgent-pulse 1.5s ease-in-out infinite, urgent-jitter 0.9s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .soldier-avatar,
          .soldier-shadow,
          .soldier-float,
          .soldier-eye,
          .soldier-pack,
          .soldier-torso,
          .soldier-head,
          .soldier-helmet,
          .soldier-helmet-glint,
          .soldier-arm-left,
          .soldier-arm-right,
          .soldier-leg-left,
          .soldier-leg-right,
          .soldier-urgent {
            animation: none !important;
          }
        }
      `}</style>

      <Stack direction="row" alignItems="flex-end" spacing={1}>
        <IconButton
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          sx={{ p: 0, bgcolor: "transparent", "&:hover": { bgcolor: "transparent" } }}
          title="Recordatorios del soldado"
        >
          <Box sx={{ position: "relative", display: "inline-flex", alignItems: "flex-end" }}>
            <Badge
              badgeContent={pendingTasks.length}
              color="primary"
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              sx={{ "& .MuiBadge-badge": { fontSize: 11, minWidth: 20, height: 20, fontWeight: 700 } }}
            >
              <MiniSoldadoAvatar urgent={urgentCount > 0} />
            </Badge>
            {urgentCount > 0 ? (
              <Chip
                label="!"
                color="error"
                size="small"
                sx={{
                  position: "absolute",
                  top: -3,
                  right: -8,
                  height: 17,
                  minWidth: 17,
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 8,
                  "& .MuiChip-label": { px: 0.5 },
                }}
              />
            ) : null}
          </Box>
        </IconButton>

        {!open && (urgentCount > 0 || pendingTasks.length > 0) ? (
          <Button
            type="button"
            onClick={() => setOpen(true)}
            variant="outlined"
            color={urgentCount > 0 ? "error" : "inherit"}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              maxWidth: 208,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              textTransform: "none",
              fontSize: 12,
              justifyContent: "flex-start",
              textAlign: "left",
              bgcolor: urgentCount > 0 ? "error.lighter" : "background.paper",
            }}
          >
            {urgentCount > 0
              ? `${urgentCount} tarea(s) vencida(s).`
              : pendingTasks.length > 0
                ? "Soldado: revisa tus tareas."
                : "Sin tareas pendientes."}
          </Button>
        ) : null}
      </Stack>

      {open ? (
        <Card
          sx={{
            position: "relative",
            mt: 1,
            maxHeight: "70vh",
            width: "min(23.5rem, calc(100vw - 1rem))",
            overflow: "auto",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 10,
          }}
        >
          <CardContent sx={{ p: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recordatorios</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {urgentCount > 0
                  ? `${urgentCount} tarea(s) vencida(s) o para hoy.`
                  : "Panel compacto para no tapar la vista principal."}
              </Typography>
            </Box>
            <Button type="button" onClick={onOpenConfig} size="small" variant="outlined" color="inherit">
              Config
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
            <Chip label={`Pendientes: ${pendingTasks.length}`} size="small" variant="outlined" />
            <Chip label={`Hechas: ${completedCount}`} size="small" variant="outlined" />
            <Chip label={`Urgentes: ${urgentCount}`} size="small" color="error" variant="outlined" />
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {loading ? <Typography variant="caption" color="text.secondary">Cargando tareas...</Typography> : null}
            {!loading && visibleTasks.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ border: "1px solid", borderColor: "divider", bgcolor: "action.hover", borderRadius: 1.5, px: 1, py: 1 }}>
                No hay tareas pendientes.
              </Typography>
            ) : null}
            {!loading
              ? visibleTasks.map((task) => {
                  const isUrgent = task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey);
                  return (
                    <Box
                      key={task.tareaId}
                      sx={{
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: isUrgent ? "error.light" : "divider",
                        bgcolor: isUrgent ? "rgba(179,38,30,0.06)" : "action.hover",
                        px: 1,
                        py: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Button
                          type="button"
                          onClick={() => void onToggleTask(task.tareaId, !task.completada)}
                          size="small"
                          variant="outlined"
                          color="inherit"
                          sx={{ minWidth: 0, width: 24, height: 24, p: 0, mt: 0.25 }}
                          aria-label="Marcar como completada"
                        >
                          {task.completada ? "x" : ""}
                        </Button>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" sx={{ fontWeight: 700, color: isUrgent ? "error.main" : "text.primary" }}>
                              {task.titulo}
                            </Typography>
                            <Chip
                              label={task.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                              size="small"
                              color={task.prioridad === "URGENTE" ? "error" : "default"}
                              sx={{ height: 20, fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}
                            />
                          </Stack>
                          {task.nota ? <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>{task.nota}</Typography> : null}
                          {task.fechaLimite ? (
                            <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: isUrgent ? "error.main" : "text.secondary", fontWeight: isUrgent ? 700 : 400 }}>
                              {`Limite: ${formatDateOnlyForDisplay(task.fechaLimite)}`}
                            </Typography>
                          ) : null}
                        </Box>
                      </Stack>
                    </Box>
                  );
                })
              : null}
            {!loading && pendingTasks.length > visibleTasks.length ? (
              <Typography variant="caption" color="text.secondary">{`+${pendingTasks.length - visibleTasks.length} tarea(s) mas en Config.`}</Typography>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              type="button"
              onClick={() => setShowComposer((current) => !current)}
              size="small"
              variant="outlined"
              color="inherit"
            >
              {showComposer ? "Ocultar bloc" : "Abrir bloc"}
            </Button>
            <Button type="button" onClick={onOpenConfig} size="small" variant="outlined" color="inherit">
              Ver todas
            </Button>
          </Stack>

          {showComposer ? (
            <Box sx={{ mt: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 1.2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
                Nueva tarea
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  placeholder="Titulo"
                  inputProps={{ maxLength: 140 }}
                  size="small"
                />
                <TextField
                  type="date"
                  value={fechaLimite}
                  onChange={(event) => setFechaLimite(event.target.value)}
                  size="small"
                />
                <TextField
                  select
                  value={prioridad}
                  onChange={(event) => setPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
                  size="small"
                >
                  <option value="NORMAL">Prioridad: Normal</option>
                  <option value="URGENTE">Prioridad: Urgente</option>
                </TextField>
                <TextField
                  value={nota}
                  onChange={(event) => setNota(event.target.value)}
                  placeholder="Nota breve"
                  inputProps={{ maxLength: 2500 }}
                  multiline
                  minRows={2}
                  size="small"
                />
                <Button
                  type="button"
                  disabled={saving || titulo.trim().length < 2}
                  onClick={() => void submit()}
                  variant="contained"
                  size="small"
                >
                  {saving ? "Guardando..." : "Agregar tarea"}
                </Button>
              </Stack>
            </Box>
          ) : null}
          <Divider sx={{ mt: 0.5, opacity: 0 }} />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
