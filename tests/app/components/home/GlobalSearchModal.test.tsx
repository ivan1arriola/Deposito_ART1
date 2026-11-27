// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalSearchModal } from "@/app/components/home/GlobalSearchModal";
import type { OficialSuboficial, Personal } from "@/types/entities";

afterEach(cleanup);

const personalSample: Personal[] = [
  {
    ci: "4.123.456-7",
    nombre1: "José",
    nombre2: "María",
    apellido1: "Pérez",
    apellido2: "Gómez",
    rangoId: 1,
    bateriaId: 1,
    fechaIngreso: "2020-01-10",
    esReingreso: false,
    fechaIngresoOriginal: null,
    telefonoContacto: null,
    tallas: [],
    rango: {
      rangoId: 1,
      abreviacion: "Sdo. 1ra.",
      nombreCompleto: "Soldado de Primera",
      orden: 10,
    },
    bateria: { bateriaId: 1, nombre: "Batería A", orden: 1 },
  },
];

const oficialesSample: OficialSuboficial[] = [
  {
    ci: "3.987.654-1",
    tipo: "OFICIAL",
    nombre1: "Andrés",
    nombre2: null,
    apellido1: "Rodríguez",
    apellido2: null,
    gradoMandoId: 1,
    rangoId: 1,
    nombre: "Andrés",
    apellido: "Rodríguez",
    telefonoContacto: null,
    tallas: [],
    gradoMando: {
      gradoMandoId: 1,
      abreviacion: "Tte. 1ro.",
      nombreCompleto: "Teniente Primero",
      orden: 3,
    },
  },
];

function GlobalSearchHarness({ onSelectPersona }: { onSelectPersona: (ci: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir buscador
      </button>
      <GlobalSearchModal
        open={open}
        onClose={() => setOpen(false)}
        personal={personalSample}
        oficialesSuboficiales={oficialesSample}
        onSelectPersona={onSelectPersona}
      />
    </div>
  );
}

describe("GlobalSearchModal", () => {
  it("enfoca el campo al abrir, normaliza tildes/CI, selecciona persona y devuelve el foco al cerrar con Escape", async () => {
    const onSelectPersona = vi.fn();
    render(<GlobalSearchHarness onSelectPersona={onSelectPersona} />);

    const trigger = screen.getByRole("button", { name: "Abrir buscador" });
    trigger.focus();
    fireEvent.click(trigger);

    const input = await screen.findByRole("textbox", { name: "Buscar por cédula o nombre" });
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });

    // Búsqueda sin tildes que coincide con "José María Pérez Gómez"
    fireEvent.change(input, { target: { value: "jose maria perez" } });
    const matchButton = screen.getByRole("button", { name: /José Pérez/i });
    expect(matchButton).toBeTruthy();

    // Búsqueda por CI sin puntos ni guiones
    fireEvent.change(input, { target: { value: "3987654" } });
    const oficialButton = screen.getByRole("button", { name: /Andrés Rodríguez/i });
    expect(oficialButton).toBeTruthy();

    fireEvent.click(oficialButton);
    expect(onSelectPersona).toHaveBeenCalledWith("3.987.654-1");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    // Reabrir y cerrar con Escape limpiando la consulta y devolviendo el foco
    fireEvent.click(trigger);
    const reopenedInput = (await screen.findByRole("textbox", {
      name: "Buscar por cédula o nombre",
    })) as HTMLInputElement;
    expect(reopenedInput.value).toBe("");

    fireEvent.keyDown(reopenedInput, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
