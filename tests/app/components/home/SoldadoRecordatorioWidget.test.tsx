// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SoldadoRecordatorioWidget } from "@/app/components/home/SoldadoRecordatorioWidget";
import type { RecordatorioTarea } from "@/types/entities";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setWidth(width: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      let matches = false;
      if (query.includes("max-width: 599.95px")) {
        matches = width <= 599.95;
      } else if (query.includes("min-width: 1536px")) {
        matches = width >= 1536;
      } else if (query.includes("min-width: 1200px")) {
        matches = width >= 1200;
      } else if (query.includes("min-width: 900px")) {
        matches = width >= 900;
      }
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

const sampleTasks: RecordatorioTarea[] = [
  {
    tareaId: "t-1",
    usuarioId: "u-1",
    titulo: "Controlar stock crítico",
    nota: "Revisar cascos",
    fechaLimite: "2026-11-27",
    prioridad: "URGENTE",
    completada: false,
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
  },
  {
    tareaId: "t-2",
    usuarioId: "u-1",
    titulo: "Archivar planilla",
    nota: "",
    fechaLimite: null,
    prioridad: "NORMAL",
    completada: true,
    createdAt: "2026-11-19T10:00:00.000Z",
    updatedAt: "2026-11-21T10:00:00.000Z",
  },
];

describe("SoldadoRecordatorioWidget sin MUI", () => {
  it("preserva los umbrales de 600, 900, 1200 y 1536 px para el tamaño del avatar", () => {
    const cases = [
      { width: 599, expectedSize: "82px" },
      { width: 600, expectedSize: "96px" },
      { width: 900, expectedSize: "108px" },
      { width: 1200, expectedSize: "120px" },
      { width: 1536, expectedSize: "132px" },
    ];

    for (const testCase of cases) {
      setWidth(testCase.width);
      const { container, unmount } = render(
        <SoldadoRecordatorioWidget
          tasks={sampleTasks}
          loading={false}
          saving={false}
          displayName="Juan Pérez"
          onCreateTask={vi.fn()}
          onToggleTask={vi.fn()}
          onOpenConfig={vi.fn()}
        />
      );
      const avatar = container.querySelector<HTMLElement>("span.soldier-avatar");
      expect(avatar?.style.width).toBe(testCase.expectedSize);
      unmount();
    }
  });

  it("abre controles en escritorio, filtra tareas, permite carga rápida y alterna estado", async () => {
    setWidth(1280);
    const onCreateTask = vi.fn().mockResolvedValue(undefined);
    const onToggleTask = vi.fn().mockResolvedValue(undefined);

    render(
      <SoldadoRecordatorioWidget
        tasks={sampleTasks}
        loading={false}
        saving={false}
        displayName="Juan Pérez"
        onCreateTask={onCreateTask}
        onToggleTask={onToggleTask}
        onOpenConfig={vi.fn()}
      />
    );

    const soldierBtn = screen.getByRole("button", { name: "Recordatorios del soldado" });
    fireEvent.click(soldierBtn);
    expect(soldierBtn.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /1 urgente\(s\)/i }));
    expect(screen.getByText("Controlar stock crítico")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hechas (1)" }));
    expect(screen.getByText("Archivar planilla")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pendientes (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Hecha" }));
    expect(onToggleTask).toHaveBeenCalledWith("t-1", true);

    fireEvent.click(screen.getByRole("button", { name: "Nueva tarea rapida" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Título de tarea" }), {
      target: { value: "Verificar extintores" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar tarea" }));

    await waitFor(() => {
      expect(onCreateTask).toHaveBeenCalledWith({
        titulo: "Verificar extintores",
        nota: "",
        fechaLimite: null,
        prioridad: "NORMAL",
      });
    });
  });

  it("en móvil (< 600px) abre el panel como diálogo inferior accesible y cierra con Escape", async () => {
    setWidth(390);
    render(
      <SoldadoRecordatorioWidget
        tasks={sampleTasks}
        loading={false}
        saving={false}
        displayName="Juan Pérez"
        onCreateTask={vi.fn()}
        onToggleTask={vi.fn()}
        onOpenConfig={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Recordatorios del soldado" }));
    fireEvent.click(screen.getByRole("button", { name: /1 urgente\(s\)/i }));

    const dialog = await screen.findByRole("dialog", { name: "Recordatorios" });
    expect(dialog).toBeTruthy();

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Recordatorios" })).toBeNull();
    });
  });
});
