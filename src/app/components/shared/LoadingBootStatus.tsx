"use client";

import { useEffect, useMemo, useState } from "react";
import { Stack, Typography } from "@mui/material";
import { LoadingInline } from "./LoadingSpinner";

type BootStep = {
  title: string;
  detail: string;
};

const BOOT_STEPS: BootStep[] = [
  {
    title: "Consultando base de datos principal",
    detail: "Validando conexion, tablas y permisos operativos.",
  },
  {
    title: "Cargando personal, grados y baterias",
    detail: "Sincronizando padrones y parametros institucionales.",
  },
  {
    title: "Calculando stock, préstamos y movimientos",
    detail: "Reconstruyendo saldos y estado de equipos.",
  },
  {
    title: "Preparando paneles y accesos de la interfaz",
    detail: "Ajustando vistas segun tu sesión y permisos.",
  },
];

export function LoadingBootStatus() {
  const [stepIndex, setStepIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % BOOT_STEPS.length);
    }, 1800);
    return () => window.clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const dotsTimer = window.setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 420);
    return () => window.clearInterval(dotsTimer);
  }, []);

  const activeStep = BOOT_STEPS[stepIndex] ?? BOOT_STEPS[0];
  const dynamicTitle = useMemo(() => `${activeStep.title}${".".repeat(dotCount)}`, [activeStep.title, dotCount]);

  return (
    <Stack spacing={0.65} alignItems="center">
      <LoadingInline
        label={dynamicTitle}
        size="md"
        textClassName="text-sm font-semibold text-[var(--color-text-secondary)]"
      />
      <Typography variant="caption" sx={{ color: "var(--color-text-muted)" }}>
        {activeStep.detail}
      </Typography>
    </Stack>
  );
}
