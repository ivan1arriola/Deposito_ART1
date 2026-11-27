// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialogModal } from "@/app/components/modals/ConfirmDialog";
import { PersonalActions } from "@/app/components/personal/PersonalActions";
import {
  ActionMenu,
  Badge,
  Card,
  LoadingOverlay,
  PaginationControls,
  SmallActionButton,
} from "@/app/components/shared";
import { LoadingBootStatus } from "@/app/components/shared/LoadingBootStatus";
import type { ConfirmDialogState } from "@/types/views";

afterEach(cleanup);

function PersonalDeleteFlowHarness() {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);

  return (
    <div>
      <PersonalActions
        canWrite={true}
        editing={false}
        tallasOpen={false}
        personLabel="Pérez, Juan"
        onToggleEdit={vi.fn()}
        onDelete={() =>
          setDialog({
            title: "Eliminar subalterno",
            message: "¿Confirmar baja?",
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            tone: "danger",
            onConfirm: async () => undefined,
          })
        }
        onToggleTallas={vi.fn()}
        onEntrega={vi.fn()}
        onDevolucion={vi.fn()}
        onObservacion={vi.fn()}
        onViewMoves={vi.fn()}
        onOpenProfile={vi.fn()}
        onOpenSheet={vi.fn()}
      />
      <ConfirmDialogModal
        dialog={dialog}
        busy={false}
        onClose={() => setDialog(null)}
        onConfirm={vi.fn()}
      />
    </div>
  );
}

describe("Controles compartidos sin MUI", () => {
  it("renderiza PaginationControls con tamaños configurables y etiquetas ARIA en español", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <PaginationControls
        page={2}
        pageSize={10}
        totalItems={45}
        itemLabel="registro"
        pageSizeOptions={[10, 25, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByText("Mostrando 11 a 20 de 45 registros")).toBeTruthy();
    const currentPage = screen.getByRole("button", { name: "Página 2, actual" });
    expect(currentPage.getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.change(screen.getByRole("combobox", { name: "Elementos por página (registro)" }), {
      target: { value: "25" },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it("soporta ActionMenu con acción única y con menú desplegable múltiple", () => {
    const singleAction = vi.fn();
    const editAction = vi.fn();
    const deleteAction = vi.fn();

    render(
      <div>
        <ActionMenu
          actions={[
            { label: "Editar único", icon: "edit", tone: "primary", onClick: singleAction },
          ]}
        />
        <ActionMenu
          buttonLabel="Acciones"
          actions={[
            { label: "Editar equipo", icon: "edit", tone: "primary", onClick: editAction },
            { label: "Eliminar equipo", icon: "trash", tone: "danger", onClick: deleteAction },
          ]}
        />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar único" }));
    expect(singleAction).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Acciones" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Editar equipo" }));
    expect(editAction).toHaveBeenCalledOnce();
  });

  it("cierra el menú de Personal al abrir ConfirmDialog y devuelve el foco al disparador al cancelar", async () => {
    render(<PersonalDeleteFlowHarness />);

    const trigger = screen.getByRole("button", { name: "Más acciones para Pérez, Juan" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("menuitem", { name: "Borrar" }));
    expect(screen.queryByRole("menuitem", { name: "Borrar" })).toBeNull();
    expect(screen.getByRole("alertdialog")).toBeTruthy();

    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelButton);
    });

    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("renderiza Card, Badge, SmallActionButton, LoadingOverlay y LoadingBootStatus", () => {
    const onClick = vi.fn();
    render(
      <div>
        <Card variant="elevated" hover>
          <Badge variant="success" size="sm">
            Activo
          </Badge>
          <SmallActionButton text="Guardar" tone="ok" onClick={onClick} />
        </Card>
        <LoadingBootStatus />
        <LoadingOverlay visible={true} label="Procesando datos..." />
      </div>
    );

    expect(screen.getByText("Activo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByText("Procesando datos...")).toBeTruthy();
  });
});
