"use client";

import Image from "next/image";
import type { CurrentUser } from "@/types/entities";

type DashboardHeroProps = {
  loading: boolean;
  currentUser: CurrentUser;
  canManageAccount: boolean;
  personalCount: number;
  equiposRegistradosCount: number;
  movimientosTotal: number;
  roleLabel: (role: CurrentUser["rol"]) => string;
  onReload: () => void;
  onEditOwnUser: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
};

export function DashboardHero({
  loading,
  currentUser,
  canManageAccount,
  personalCount,
  equiposRegistradosCount,
  movimientosTotal,
  roleLabel,
  onReload,
  onEditOwnUser,
  onChangePassword,
  onLogout,
}: DashboardHeroProps) {
  return (
    <section className="ej-hero relative overflow-hidden rounded-[28px] border border-white/10 px-4 py-5 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:rounded-[32px] sm:px-7 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(186,176,140,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(102,112,77,0.34),transparent_36%)]" />
      <div className="pointer-events-none absolute -right-16 top-6 h-48 w-48 rounded-full border border-white/10 bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[#66704D]/40 blur-3xl" />

      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-[#FFCC00] sm:truncate sm:text-[11px] sm:tracking-[0.24em]">
            {'Grupo "Brig. Gral. Manuel Oribe" de Artilleria 105mm No. 1'}
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:mt-5 xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:items-center">
          <div className="order-3 xl:order-1">
            <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_56%)]" />
              <div className="relative flex min-h-[190px] items-center justify-center sm:min-h-[260px] xl:min-h-[320px]">
                <Image
                  src="/assets/logo-artilleria.jpg"
                  alt="Logo Artilleria"
                  width={420}
                  height={320}
                  priority
                  className="h-auto max-h-[220px] w-full max-w-[220px] rounded-[24px] border border-[#BAB08C]/65 bg-white/95 object-contain p-2 shadow-[0_22px_50px_rgba(15,23,42,0.3)] sm:max-h-[280px] sm:max-w-[280px] xl:max-h-[300px] xl:max-w-[320px]"
                />
              </div>
            </article>
          </div>

          <div className="order-1 flex min-w-0 flex-col items-center justify-center text-center xl:order-2">
            <span className="rounded-full border border-[#BAB08C]/35 bg-[#8D845B]/25 px-3 py-1 text-[11px] font-semibold text-[#F4F1E4]">
              {loading ? "Sincronizando datos" : "Panel en servicio"}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">Deposito General</h1>
          </div>

          <div className="order-2 flex flex-col gap-3 xl:order-3">
            <article className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BAB08C]">Cuenta activa</p>
              <p className="mt-2 text-lg font-semibold text-white">{currentUser.username}</p>
              <p className="mt-1 text-sm text-white/78">{`Rol: ${roleLabel(currentUser.rol)}`}</p>
            </article>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button type="button" onClick={onReload} className="ej-button-muted w-full rounded-2xl px-3 py-3 text-sm font-semibold">
                Recargar panel
              </button>
              {canManageAccount ? (
                <button
                  type="button"
                  onClick={onEditOwnUser}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Cambiar usuario
                </button>
              ) : null}
              <button
                type="button"
                onClick={onChangePassword}
                disabled={!canManageAccount}
                className="w-full rounded-2xl border border-[#BAB08C]/35 bg-black/30 px-3 py-3 text-sm font-semibold text-white transition hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cambiar contraseña
              </button>
              {!canManageAccount ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80 sm:col-span-2 xl:col-span-1">
                  Modo solo lectura: esta cuenta no puede cambiar credenciales ni datos.
                </div>
              ) : null}
              <button type="button" onClick={onLogout} className="ej-button-danger w-full rounded-2xl px-3 py-3 text-sm font-semibold sm:col-span-2 xl:col-span-1">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[#BAB08C]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#BAB08C]">Personal</p>
            <p className="text-lg font-bold text-white">{personalCount}</p>
          </div>
          <div className="rounded-xl border border-[#BAB08C]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#BAB08C]">
              <span className="sm:hidden">Equipos</span>
              <span className="hidden sm:inline">Equipos registrados</span>
            </p>
            <p className="text-lg font-bold text-white">{equiposRegistradosCount}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-[#BAB08C]/35 bg-black/30 px-3 py-2 backdrop-blur-sm sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider text-[#BAB08C]">Movimientos</p>
            <p className="text-lg font-bold text-white">{movimientosTotal}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
