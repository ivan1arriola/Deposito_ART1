import "dotenv/config";
import { prisma } from "../src/lib/prisma";

function parseIdsFromArgv(argv: string[]) {
  const ids: bigint[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--id" && argv[i + 1]) {
      const raw = argv[i + 1].trim();
      if (/^\d+$/.test(raw)) ids.push(BigInt(raw));
      i += 1;
    } else if (/^\d+$/.test(arg.trim())) {
      ids.push(BigInt(arg.trim()));
    }
  }
  return Array.from(new Set(ids));
}

async function main() {
  const ids = parseIdsFromArgv(process.argv.slice(2));
  if (ids.length === 0) {
    console.error("Uso: npx tsx scripts/diagnose-movimiento-responsable.ts --id <movimientoId>");
    process.exitCode = 1;
    return;
  }

  for (const movimientoId of ids) {
    const movimiento = await prisma.movimiento.findUnique({
      where: { movimientoId },
      select: {
        movimientoId: true,
        tipo: true,
        fecha: true,
        observaciones: true,
        destinatarioRecinto: {
          select: {
            clase: true,
            nombre: true,
            responsableGrado: true,
            responsableNombre: true,
            responsableApellido: true,
            responsableCi: true,
          },
        },
        destinatarioExterno: {
          select: {
            personaExterna: {
              select: {
                ci: true,
                grado: true,
                nombre: true,
                apellido: true,
                unidadDestino: true,
              },
            },
          },
        },
      },
    });

    const auditorias = await prisma.auditoria.findMany({
      where: {
        entidadId: movimientoId.toString(),
        entidad: { in: ["REGISTRO", "MOVIMIENTO"] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        auditoriaId: true,
        accion: true,
        createdAt: true,
        detalle: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          movimientoId: movimientoId.toString(),
          actual: movimiento,
          auditorias: auditorias.map((entry) => ({
            auditoriaId: entry.auditoriaId.toString(),
            accion: entry.accion,
            createdAt: entry.createdAt.toISOString(),
            detalle: entry.detalle,
          })),
        },
        null,
        2
      )
    );
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
