function normalizeRank(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/[."']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function rankPriority(abreviacion: string) {
  const normalized = normalizeRank(abreviacion);
  if (normalized.startsWith("sgto")) return 1;
  if (normalized.startsWith("cabo 1")) return 2;
  if (normalized.startsWith("cabo 2")) return 3;
  if (normalized.startsWith("sdo 1")) return 4;
  return 99;
}

export function compareRankAbbreviation(a: string, b: string) {
  const byPriority = rankPriority(a) - rankPriority(b);
  if (byPriority !== 0) return byPriority;
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

type PersonalLike = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  rango: {
    abreviacion: string;
  };
};

export function comparePersonalByHierarchy(a: PersonalLike, b: PersonalLike) {
  const byRank = compareRankAbbreviation(a.rango.abreviacion, b.rango.abreviacion);
  if (byRank !== 0) return byRank;

  const byApellido1 = a.apellido1.localeCompare(b.apellido1, "es", { sensitivity: "base" });
  if (byApellido1 !== 0) return byApellido1;

  const byApellido2 = (a.apellido2 ?? "").localeCompare(b.apellido2 ?? "", "es", { sensitivity: "base" });
  if (byApellido2 !== 0) return byApellido2;

  const byNombre1 = a.nombre1.localeCompare(b.nombre1, "es", { sensitivity: "base" });
  if (byNombre1 !== 0) return byNombre1;

  const byNombre2 = (a.nombre2 ?? "").localeCompare(b.nombre2 ?? "", "es", { sensitivity: "base" });
  if (byNombre2 !== 0) return byNombre2;

  return a.ci.localeCompare(b.ci, "es", { sensitivity: "base" });
}

