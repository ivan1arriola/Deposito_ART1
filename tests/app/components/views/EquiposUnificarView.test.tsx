// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EquiposUnificarView } from "@/app/components/views/EquiposUnificarView";

describe("EquiposUnificarView Component", () => {
  const defaultEquipos = [
    { equipoId: "1", nombre: "Chaleco Táctico", tipo: "GENERAL" as const, activo: true },
    { equipoId: "2", nombre: "Casco Kevlar", tipo: "GENERAL" as const, activo: true },
    { equipoId: "3", nombre: "Cinturón de Combate", tipo: "GENERAL" as const, activo: true },
  ];

  const mockProps = {
    canWrite: true,
    equipos: defaultEquipos,
    mergeEquipoOrigenId: "",
    mergeEquipoDestinoId: "",
    onMergeEquipoOrigenIdChange: vi.fn(),
    onMergeEquipoDestinoIdChange: vi.fn(),
    onMergeEquipos: vi.fn(),
  };

  it("renderiza correctamente los títulos y la guía explicativa", () => {
    render(<EquiposUnificarView {...mockProps} />);

    expect(screen.getByText("Unificar Catálogo de Equipos")).toBeDefined();
    expect(
      screen.getByText("Herramienta de depuración y consolidación del inventario")
    ).toBeDefined();
    expect(screen.getByText("¿Cómo funciona la unificación de equipos?")).toBeDefined();
    expect(screen.getByText(/Todos los registros históricos del/i)).toBeDefined();
  });

  it("muestra advertencia si hay menos de 2 equipos", () => {
    render(
      <EquiposUnificarView
        {...mockProps}
        equipos={[{ equipoId: "1", nombre: "Chaleco Único", tipo: "GENERAL", activo: true }]}
      />
    );

    expect(screen.getByText("No hay suficientes equipos")).toBeDefined();
    expect(
      screen.getByText(
        "Se requieren al menos 2 equipos registrados en el catálogo para poder realizar una fusión de registros."
      )
    ).toBeDefined();
  });

  it("desactiva los controles si el usuario no tiene permisos de escritura", () => {
    render(<EquiposUnificarView {...mockProps} canWrite={false} />);

    expect(
      screen.getByText("Modo de sólo lectura: no tienes permisos para unificar equipos.")
    ).toBeDefined();
    // El botón debe estar deshabilitado
    const button = screen.getByRole("button", { name: "Unificar y Eliminar Origen" });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("permite seleccionar equipo origen y equipo destino y llama a los callbacks", () => {
    const onMergeOrigenChange = vi.fn();
    const onMergeDestinoChange = vi.fn();

    render(
      <EquiposUnificarView
        {...mockProps}
        onMergeEquipoOrigenIdChange={onMergeOrigenChange}
        onMergeEquipoDestinoIdChange={onMergeDestinoChange}
      />
    );

    // Los select nativos permiten elegir equipo origen y equipo destino.
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBe(2);
  });

  it("habilita el botón de fusión solo si se seleccionaron origen y destino válidos", () => {
    const { rerender } = render(<EquiposUnificarView {...mockProps} />);

    let button = screen.getByRole("button", { name: "Unificar y Eliminar Origen" });
    expect(button.hasAttribute("disabled")).toBe(true);

    // Rerender con origen seleccionado
    rerender(<EquiposUnificarView {...mockProps} mergeEquipoOrigenId="1" />);
    button = screen.getByRole("button", { name: "Unificar y Eliminar Origen" });
    expect(button.hasAttribute("disabled")).toBe(true);

    // Rerender con origen y destino seleccionados
    rerender(
      <EquiposUnificarView {...mockProps} mergeEquipoOrigenId="1" mergeEquipoDestinoId="2" />
    );
    button = screen.getByRole("button", { name: "Unificar y Eliminar Origen" });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("desencadena la función de unificar al hacer clic en el botón", () => {
    const onMergeMock = vi.fn();
    render(
      <EquiposUnificarView
        {...mockProps}
        mergeEquipoOrigenId="1"
        mergeEquipoDestinoId="2"
        onMergeEquipos={onMergeMock}
      />
    );

    const button = screen.getByRole("button", { name: "Unificar y Eliminar Origen" });
    fireEvent.click(button);

    expect(onMergeMock).toHaveBeenCalledWith("1", "2");
  });
});
