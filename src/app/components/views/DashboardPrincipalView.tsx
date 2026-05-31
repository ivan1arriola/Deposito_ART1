"use client";

import Image from "next/image";
import type { MainView } from "@/types/views";

type DashboardPrincipalViewProps = {
  nombreUsuario: string;
  personalCount: number;
  oficialesSuboficialesCount: number;
  equiposRegistradosCount: number;
  equiposActivosCount: number;
  movimientosTotal: number;
  tareasPendientes: number;
  tareasUrgentes: number;
  canWrite: boolean;
  isAdmin: boolean;
  onNavigate: (view: MainView) => void;
};

type QuickAction = {
  id: string;
  label: string;
  description: string;
  view: MainView;
  visible: boolean;
};

export function DashboardPrincipalView({
  nombreUsuario,
  personalCount,
  oficialesSuboficialesCount,
  equiposRegistradosCount,
  equiposActivosCount,
  movimientosTotal,
  tareasPendientes,
  tareasUrgentes,
  canWrite,
  isAdmin,
  onNavigate,
}: DashboardPrincipalViewProps) {
  const metrics = [
    {
      key: "personal",
      label: "Subalternos",
      value: personalCount,
      tone: "from-[#f8f9f5] to-[#eef2e7] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]",
    },
    {
      key: "oficiales",
      label: "Oficiales y suboficiales",
      value: oficialesSuboficialesCount,
      tone: "from-[#f4f8fa] to-[#e7eef5] border-[#c4d3e3] text-[#1d3348]",
    },
    {
      key: "equipos",
      label: "Catálogo de Equipos",
      value: equiposRegistradosCount,
      tone: "from-[#f6f8f2] to-[#e9efde] border-[#c5d4b2] text-[#2a3a1f]",
    },
    {
      key: "equipos-activos",
      label: "Equipos activos",
      value: equiposActivosCount,
      tone: "from-[#f3f8f4] to-[#e4efe6] border-[#b7d1bc] text-[#1d3a25]",
    },
    {
      key: "movimientos",
      label: "Movimientos",
      value: movimientosTotal,
      tone: "from-[#f8f6f3] to-[#f0ebe5] border-[#d7c9b8] text-[#4a3526]",
    },
    {
      key: "urgencias",
      label: "Recordatorios urgentes",
      value: tareasUrgentes,
      tone: "from-[#fff5f5] to-[#ffe9e9] border-[#efb3b3] text-[#7f1d1d]",
    },
  ] as const;

  const actions: QuickAction[] = [
    {
      id: "personal",
      label: "Ver personal",
      description: "Listado de subalternos y ficha individual.",
      view: "personal",
      visible: true,
    },
    {
      id: "stock",
      label: "Ir a stock",
      description: "Control general de altas, bajas e historial.",
      view: "stock_total",
      visible: true,
    },
    {
      id: "prestamos-registrar",
      label: "Registrar préstamo",
      description: "Alta de nuevos préstamos de equipo.",
      view: "prestamos_registrar",
      visible: canWrite,
    },
    {
      id: "prestamos-vigentes",
      label: "Préstamos vigentes",
      description: "Control de préstamos pendientes y devoluciones.",
      view: "prestamos_vigentes",
      visible: true,
    },
    {
      id: "prestamos-historial",
      label: "Historial de préstamos",
      description: "Consulta histórica de préstamos registrados.",
      view: "prestamos_historial",
      visible: true,
    },
    {
      id: "recordatorios",
      label: "Recordatorios",
      description: "Configurar tareas y visibilidad del widget.",
      view: "recordatorios",
      visible: true,
    },
    {
      id: "etiquetado",
      label: "Etiquetado",
      description: "Codigos SIE y listado de cajas.",
      view: "etiquetado_codigos_sie",
      visible: canWrite,
    },
    {
      id: "auditoria",
      label: "Auditoria",
      description: "Seguimiento de acciones y eventos de sistema.",
      view: "auditoria",
      visible: isAdmin,
    },
  ];

  return (
    <section className="mt-6 grid grid-cols-1 gap-4">
      <article className="ej-card overflow-hidden rounded-3xl p-0">
        <div className="border-b border-[var(--color-border-subtle)] bg-[linear-gradient(135deg,var(--color-surface-muted)_0%,var(--color-surface-base)_100%)] px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr] lg:equipos-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-ejercito-brown)]">Dashboard principal</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Bienvenido, {nombreUsuario}</h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-secondary)]">
                Vista de control rapido para entrar a los modulos clave y validar el estado operativo general del deposito.
              </p>
            </div>

            <figure className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] shadow-sm">
              <Image
                src="/assets/dashboard-foto.jpg"
                alt="Foto institucional del grupo"
                width={1200}
                height={800}
                className="h-44 w-full object-cover sm:h-52"
                priority
              />
            </figure>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <article
                key={metric.key}
                className={`rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-sm ${metric.tone}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-90">{metric.label}</p>
                <p className="mt-2 text-3xl font-black leading-none">{metric.value}</p>
              </article>
            ))}
          </div>
        </div>
      </article>

      <article className="ej-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:equipos-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-ejercito-brown)]">Accesos rapidos</p>
            <h3 className="mt-1 text-lg font-extrabold text-[var(--color-text-primary)]">Navegacion directa por modulo</h3>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">Tareas pendientes: {tareasPendientes}</p>
        </div>

        <div className="mt-3 flex justify-end">
          <details className="group relative w-full sm:max-w-[26rem]">
            <summary className="flex min-h-11 cursor-pointer list-none equipos-center justify-between rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-4 py-3 text-sm font-black text-[var(--color-text-primary)] transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]">
              <span>Menu de accesos rapidos</span>
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] transition group-open:rotate-180">▼</span>
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-2 shadow-xl">
              <div className="flex flex-col gap-2">
                {actions
                  .filter((action) => action.visible)
                  .map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onNavigate(action.view)}
                      className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-left transition hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]"
                    >
                      <p className="text-sm font-black text-[var(--color-text-primary)]">{action.label}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{action.description}</p>
                    </button>
                  ))}
              </div>
            </div>
          </details>
        </div>
      </article>
    </section>
  );
}
