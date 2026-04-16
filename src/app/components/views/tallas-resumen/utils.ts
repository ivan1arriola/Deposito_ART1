import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import { tallasMap } from "@/lib/form-mappers";
import type { Bateria, OficialSuboficial, Personal } from "@/types/entities";
import type { MissingTallasEntry, ResumenBateria, ResumenTalla } from "./types";

export function buildTallasResumen(personas: Personal[]): ResumenTalla[] {
  return TALLA_KEYS.map((key) => {
    const counter = new Map<string, number>();

    for (const persona of personas) {
      const tallasPersona = tallasMap(persona.tallas);
      const raw = tallasPersona[key];
      const value = raw && raw !== "-" ? raw : "Sin dato";
      counter.set(value, (counter.get(value) ?? 0) + 1);
    }

    const values = Array.from(counter.entries())
      .map(([talla, cantidad]) => ({ talla, cantidad }))
      .sort((a, b) => {
        if (a.talla === "Sin dato") return 1;
        if (b.talla === "Sin dato") return -1;
        return a.talla.localeCompare(b.talla, "es", { sensitivity: "base", numeric: true });
      });

    return {
      key,
      label: TALLA_LABELS[key],
      values,
    };
  });
}

export function buildResumenUnidad(personal: Personal[]): ResumenBateria {
  return {
    key: "ALL",
    nombre: "Unidad",
    total: personal.length,
    tallas: buildTallasResumen(personal),
  };
}

export function buildResumenTallasPorBateria(baterias: Bateria[], personal: Personal[]): ResumenBateria[] {
  const bateriasConEtiqueta = [
    ...baterias
      .map((bateria) => ({ key: String(bateria.bateriaId), nombre: bateria.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
    { key: "NONE", nombre: "Sin bateria" },
  ];

  const personalPorBateria = new Map<string, Personal[]>();
  for (const bateria of bateriasConEtiqueta) {
    personalPorBateria.set(bateria.key, []);
  }

  for (const persona of personal) {
    const key = persona.bateriaId == null ? "NONE" : String(persona.bateriaId);
    const bucket = personalPorBateria.get(key);
    if (bucket) {
      bucket.push(persona);
      continue;
    }
    personalPorBateria.set(key, [persona]);
  }

  return bateriasConEtiqueta.map((bateria) => {
    const personas = personalPorBateria.get(bateria.key) ?? [];
    return {
      key: bateria.key,
      nombre: bateria.nombre,
      total: personas.length,
      tallas: buildTallasResumen(personas),
    } satisfies ResumenBateria;
  });
}

export function buildResumenOficialesSuboficiales(oficialesSuboficiales: OficialSuboficial[]) {
  return TALLA_KEYS.map((key) => {
    const oficialesCounter = new Map<string, number>();
    const suboficialesCounter = new Map<string, number>();

    for (const registro of oficialesSuboficiales) {
      const talles = tallasMap(registro.tallas);
      const value = talles[key] && talles[key] !== "-" ? talles[key] : "Sin dato";
      const counter = registro.tipo === "OFICIAL" ? oficialesCounter : suboficialesCounter;
      counter.set(value, (counter.get(value) ?? 0) + 1);
    }

    const tallas = Array.from(new Set([...oficialesCounter.keys(), ...suboficialesCounter.keys()])).sort((a, b) => {
      if (a === "Sin dato") return 1;
      if (b === "Sin dato") return -1;
      return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
    });

    return {
      key,
      label: TALLA_LABELS[key],
      rows: tallas.map((talla) => {
        const oficiales = oficialesCounter.get(talla) ?? 0;
        const suboficiales = suboficialesCounter.get(talla) ?? 0;
        return { talla, oficiales, suboficiales, total: oficiales + suboficiales };
      }),
    };
  });
}

export function findSubalternosConTallesIncompletos(personal: Personal[]): MissingTallasEntry[] {
  return personal
    .map((persona) => {
      const talles = tallasMap(persona.tallas);
      const missing = TALLA_KEYS.filter((key) => !talles[key] || talles[key] === "-");
      if (missing.length === 0) return null;
      const apellidos = `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
      const nombres = `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
      const label = `${persona.rango.abreviacion} ${apellidos}, ${nombres}`.trim();
      return {
        id: persona.ci,
        label,
        missing,
      };
    })
    .filter((entry): entry is MissingTallasEntry => entry !== null);
}

export function findOficialesSuboficialesConTallesIncompletos(oficialesSuboficiales: OficialSuboficial[]): MissingTallasEntry[] {
  return oficialesSuboficiales
    .map((registro) => {
      const talles = tallasMap(registro.tallas);
      const missing = TALLA_KEYS.filter((key) => !talles[key] || talles[key] === "-");
      if (missing.length === 0) return null;
      const apellidos = `${registro.apellido1} ${registro.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
      const nombres = `${registro.nombre1} ${registro.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
      const label = `${registro.gradoMando.abreviacion} ${apellidos}, ${nombres}`.trim();
      return {
        id: `${registro.tipo}-${registro.ci}`,
        label,
        missing,
      };
    })
    .filter((entry): entry is MissingTallasEntry => entry !== null);
}
