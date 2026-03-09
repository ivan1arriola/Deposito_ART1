import type { TipoPersonal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TALLA_KEYS, type TallaKey } from "@/lib/tallas";

const REFERENCE_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedValue<T> = {
  value: T;
  expiresAt: number;
};

let tallaTipoIdCache: CachedValue<Map<TallaKey, number>> | null = null;
let tallaTipoIdInflight: Promise<Map<TallaKey, number>> | null = null;

function isFresh<T>(entry: CachedValue<T> | null) {
  return Boolean(entry && entry.expiresAt > Date.now());
}

async function loadTallaTipoIdMap() {
  const rows = await prisma.tallaTipo.findMany({
    where: { nombre: { in: TALLA_KEYS as unknown as string[] } },
    select: { nombre: true, tallaTipoId: true },
  });

  const map = new Map<TallaKey, number>();
  for (const row of rows) {
    map.set(row.nombre as TallaKey, row.tallaTipoId);
  }
  return map;
}

export async function getTallaTipoIdMap() {
  if (isFresh(tallaTipoIdCache)) {
    return tallaTipoIdCache!.value;
  }

  if (!tallaTipoIdInflight) {
    tallaTipoIdInflight = loadTallaTipoIdMap()
      .then((map) => {
        tallaTipoIdCache = {
          value: map,
          expiresAt: Date.now() + REFERENCE_CACHE_TTL_MS,
        };
        return map;
      })
      .finally(() => {
        tallaTipoIdInflight = null;
      });
  }

  return tallaTipoIdInflight;
}

export function invalidateTallaTipoCache() {
  tallaTipoIdCache = null;
}

type RangoTipoCountMap = Map<TipoPersonal, number>;
let rangoTipoCountCache: CachedValue<RangoTipoCountMap> | null = null;
let rangoTipoCountInflight: Promise<RangoTipoCountMap> | null = null;

async function loadRangoTipoCountMap() {
  const rows = await prisma.rango.groupBy({
    by: ["tipo"],
    _count: { _all: true },
  });

  const map = new Map<TipoPersonal, number>();
  for (const row of rows) {
    map.set(row.tipo, row._count._all);
  }
  return map;
}

export async function getRangoCountByTipo(tipo: TipoPersonal) {
  if (!isFresh(rangoTipoCountCache)) {
    if (!rangoTipoCountInflight) {
      rangoTipoCountInflight = loadRangoTipoCountMap()
        .then((map) => {
          rangoTipoCountCache = {
            value: map,
            expiresAt: Date.now() + REFERENCE_CACHE_TTL_MS,
          };
          return map;
        })
        .finally(() => {
          rangoTipoCountInflight = null;
        });
    }
    await rangoTipoCountInflight;
  }

  return rangoTipoCountCache?.value.get(tipo) ?? 0;
}

export function invalidateRangoTipoCountCache() {
  rangoTipoCountCache = null;
}
