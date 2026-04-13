"use client";

import type { Dispatch, SetStateAction } from "react";
import { formatUruguayanCi } from "@/lib/ci";
import type { PersonalCurrentUser } from "@/app/types/home";
import type { PersonaProfileState } from "../views/PersonaProfileView";
import { PersonaProfileView } from "../views/PersonaProfileView";
import { ChangePasswordModal } from "../modals/ChangePasswordModal";
import { PersonalContactModal } from "../modals/PersonalContactModal";
import { LoadingOverlay } from "../shared";

type PersonalPortalViewProps = {
  currentUser: PersonalCurrentUser;
  personalSelfProfile: PersonaProfileState | null;
  loading: boolean;
  changeLoading: boolean;
  personalContactSaving: boolean;
  showChangePassword: boolean;
  changeCurrentPassword: string;
  changeNewPassword: string;
  changeConfirmPassword: string;
  showPersonalContactModal: boolean;
  personalContactTelefono: string;
  personalContactMail: string;
  setChangeCurrentPassword: Dispatch<SetStateAction<string>>;
  setChangeNewPassword: Dispatch<SetStateAction<string>>;
  setChangeConfirmPassword: Dispatch<SetStateAction<string>>;
  setShowChangePassword: Dispatch<SetStateAction<boolean>>;
  setPersonalContactTelefono: Dispatch<SetStateAction<string>>;
  setPersonalContactMail: Dispatch<SetStateAction<string>>;
  setShowPersonalContactModal: Dispatch<SetStateAction<boolean>>;
  onReloadProfile: () => Promise<void>;
  onOpenOwnDeliverySheetPdf: () => void;
  onLogout: () => Promise<void>;
  onSubmitChangePassword: () => Promise<void>;
  onSubmitPersonalContactUpdate: () => Promise<void>;
};

export function PersonalPortalView({
  currentUser,
  personalSelfProfile,
  loading,
  changeLoading,
  personalContactSaving,
  showChangePassword,
  changeCurrentPassword,
  changeNewPassword,
  changeConfirmPassword,
  showPersonalContactModal,
  personalContactTelefono,
  personalContactMail,
  setChangeCurrentPassword,
  setChangeNewPassword,
  setChangeConfirmPassword,
  setShowChangePassword,
  setPersonalContactTelefono,
  setPersonalContactMail,
  setShowPersonalContactModal,
  onReloadProfile,
  onOpenOwnDeliverySheetPdf,
  onLogout,
  onSubmitChangePassword,
  onSubmitPersonalContactUpdate,
}: PersonalPortalViewProps) {
  const fallbackCiDigits = currentUser.username.replace(/\D+/g, "");
  const fallbackCi = fallbackCiDigits !== "" ? Number.parseInt(fallbackCiDigits, 10) : null;
  const personalCi = currentUser.personalCi ?? (Number.isFinite(fallbackCi) ? fallbackCi : null);
  const personalCiText = personalCi !== null ? String(personalCi) : "";
  const personalCiLabel = personalCiText !== "" ? formatUruguayanCi(personalCiText) : "Sin CI";
  const personalFullName = `${currentUser.apellido}, ${currentUser.nombre}`.replace(/\s+/g, " ").trim();
  const personalProfileState: PersonaProfileState = personalSelfProfile ?? {
    identity: {
      ci: personalCiText,
      tipo: "SUBALTERNO",
      apellido: currentUser.apellido,
      nombre: currentUser.nombre,
      gradoAbreviacion: currentUser.grado,
      gradoNombre: currentUser.grado,
      bateriaNombre: null,
      telefonoContacto: null,
      mailReferencia: currentUser.mailReferencia ?? null,
      esReingreso: null,
      fechaIngreso: null,
      fechaIngresoOriginal: null,
      tallas: [],
    },
    loading: true,
    error: null,
    registros: [],
    prestamos: [],
    observaciones: [],
    equipmentSummary: [],
    timeline: [],
  };
  const personalSelfProfileLoading = personalSelfProfile?.loading ?? false;
  const personalBusyLabel = changeLoading
    ? "Actualizando contraseña..."
    : personalContactSaving
      ? "Actualizando datos de contacto..."
      : personalSelfProfileLoading
        ? "Cargando tu ficha personal..."
        : "Actualizando datos de acceso...";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
      <section className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">Portal de Personal</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Acceso de solo consulta a tu información.</p>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              {`${currentUser.grado} ${personalFullName} · CI ${personalCiLabel}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onReloadProfile()}
              className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
            >
              Recargar ficha
            </button>
            <button
              type="button"
              onClick={() => {
                setPersonalContactTelefono(personalProfileState.identity.telefonoContacto ?? "");
                setPersonalContactMail(personalProfileState.identity.mailReferencia ?? "");
                setShowPersonalContactModal(true);
              }}
              className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
            >
              Actualizar contacto
            </button>
            <button
              type="button"
              onClick={() => onOpenOwnDeliverySheetPdf()}
              disabled={personalSelfProfile?.identity.tipo !== "SUBALTERNO"}
              className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Ver hoja PDF
            </button>
            <button
              type="button"
              onClick={() => {
                setChangeCurrentPassword("");
                setChangeNewPassword("");
                setChangeConfirmPassword("");
                setShowChangePassword(true);
              }}
              className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
            >
              Cambiar contraseña
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-xl bg-[var(--color-ejercito-blue)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>

      <PersonaProfileView
        state={personalProfileState}
        onBack={() => {}}
        onReload={() => void onReloadProfile()}
        onPrintDeliverySheet={() => {}}
        onPrintPrestamos={() => {}}
        allowPrintActions={false}
        showBackButton={false}
      />

      <ChangePasswordModal
        isOpen={showChangePassword}
        currentPassword={changeCurrentPassword}
        newPassword={changeNewPassword}
        confirmPassword={changeConfirmPassword}
        loading={changeLoading}
        onCurrentPasswordChange={setChangeCurrentPassword}
        onNewPasswordChange={setChangeNewPassword}
        onConfirmPasswordChange={setChangeConfirmPassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={() => void onSubmitChangePassword()}
      />

      <PersonalContactModal
        isOpen={showPersonalContactModal}
        telefonoContacto={personalContactTelefono}
        mailReferencia={personalContactMail}
        saving={personalContactSaving}
        onTelefonoContactoChange={setPersonalContactTelefono}
        onMailReferenciaChange={setPersonalContactMail}
        onClose={() => setShowPersonalContactModal(false)}
        onSubmit={() => void onSubmitPersonalContactUpdate()}
      />

      <LoadingOverlay
        visible={loading || personalSelfProfileLoading || changeLoading || personalContactSaving}
        label={personalBusyLabel}
      />
    </main>
  );
}