import { randomUUID } from "node:crypto";
import { EstadoEquipoPrestamo, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { authorizeRequest, verifyPassword } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { dateInputToDate, getTodayDateInput } from "@/lib/date-helpers";
import { logAudit } from "@/lib/audit";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { prisma } from "@/lib/prisma";
import { normalizeSearchTerm } from "@/lib/search";

const ASCENSO_COMENTARIO_PRESTAMO = "Por ascenso a Sargento Primero";
const ASCENSO_FECHA_ESTIMADA = "Indefinido";
const ASCENSO_TX_MAX_WAIT_MS = 10_000;
const ASCENSO_TX_TIMEOUT_MS = 120_000;

type AscensoPayload = {
  adminPassword: string;
};

class AscensoError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function isValidPayload(body: unknown): body is AscensoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.adminPassword === "string" && candidate.adminPassword.trim() !== "";
}

function rankLooksLikeSargento(rank: { abreviacion: string; nombreCompleto: string }) {
  const normalized = normalizeSearchTerm(`${rank.abreviacion} ${rank.nombreCompleto}`);
  const hasSargento = normalized.includes("sargento") || normalized.includes("sgto");
  const hasPrimero = /\b(primero|1ro|1ero|1er)\b/.test(normalized);
  return hasSargento && !hasPrimero;
}

function rankLooksLikeSargentoPrimero(rank: { abreviacion: string; nombreCompleto: string }) {
  const normalized = normalizeSearchTerm(`${rank.abreviacion} ${rank.nombreCompleto}`);
  const hasSargento = normalized.includes("sargento") || normalized.includes("sgto");
  const hasPrimero = /\b(primero|1ro|1ero|1er)\b/.test(normalized);
  return hasSargento && hasPrimero;
}

export async function POST(request: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede ejecutar este ascenso." }, { status: 403 });
  }

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded || !isValidUruguayanCi(ciDecoded)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Debes confirmar la accion con la contraseña del administrador." }, { status: 400 });
  }

  const usuarioAdmin = await prisma.usuario.findUnique({
    where: { usuarioId: auth.user.usuarioId },
    select: { usuarioId: true, passwordHash: true },
  });
  if (!usuarioAdmin) {
    return NextResponse.json({ error: "Usuario administrador no encontrado." }, { status: 404 });
  }

  const passwordOk = await verifyPassword(body.adminPassword, usuarioAdmin.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: "Contraseña invalida." }, { status: 400 });
  }

  const fechaAscensoInput = getTodayDateInput();
  const fechaAscenso = dateInputToDate(fechaAscensoInput);
  if (!fechaAscenso) {
    return NextResponse.json({ error: "No se pudo resolver la fecha de ascenso." }, { status: 500 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const persona = await tx.personal.findUnique({
        where: { ci: ciDecoded },
        select: {
          ci: true,
          tipo: true,
          rangoId: true,
          apellido1: true,
          apellido2: true,
          nombre1: true,
          nombre2: true,
          rango: {
            select: {
              rangoId: true,
              abreviacion: true,
              nombreCompleto: true,
              orden: true,
            },
          },
          subalterno: {
            select: { ci: true },
          },
        },
      });

      if (!persona) {
        throw new AscensoError("PERSONA_NO_ENCONTRADA", "Personal no encontrado.");
      }
      if (persona.tipo !== TipoPersonal.SUBALTERNO || !persona.subalterno) {
        throw new AscensoError("PERSONA_NO_SUBALTERNO", "La persona no pertenece a personal subalterno.");
      }
      if (!rankLooksLikeSargento(persona.rango)) {
        throw new AscensoError("RANGO_ORIGEN_INVALIDO", "Solo se puede ascender personal con grado Sargento.");
      }

      const rangosSuboficial = await tx.rango.findMany({
        where: { tipo: TipoPersonal.SUBOFICIAL },
        select: {
          rangoId: true,
          abreviacion: true,
          nombreCompleto: true,
          orden: true,
        },
        orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
      });
      const rangoDestino = rangosSuboficial.find((rank) => rankLooksLikeSargentoPrimero(rank));
      if (!rangoDestino) {
        throw new AscensoError(
          "RANGO_DESTINO_NO_ENCONTRADO",
          "No existe un rango SUBOFICIAL identificado como Sargento Primero.",
        );
      }

      const movimientosVestuario = await tx.movimiento.findMany({
        where: {
          personalCi: ciDecoded,
          tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
        },
        select: {
          movimientoId: true,
          tipo: true,
          items: {
            select: {
              itemId: true,
              cantidad: true,
              item: {
                select: {
                  nombre: true,
                  ordenPdf: true,
                },
              },
            },
          },
        },
      });

      const netoPorItem = new Map<string, { itemId: bigint; nombre: string; ordenPdf: number; cantidadNeta: number }>();
      for (const movimiento of movimientosVestuario) {
        const factor = movimiento.tipo === TipoMovimiento.ENTREGA ? 1 : -1;
        for (const item of movimiento.items) {
          const key = item.itemId.toString();
          const prev = netoPorItem.get(key);
          if (!prev) {
            netoPorItem.set(key, {
              itemId: item.itemId,
              nombre: item.item.nombre,
              ordenPdf: item.item.ordenPdf,
              cantidadNeta: item.cantidad * factor,
            });
            continue;
          }
          prev.cantidadNeta += item.cantidad * factor;
        }
      }

      const itemsPrestamo = Array.from(netoPorItem.values())
        .filter((entry) => entry.cantidadNeta > 0)
        .sort((a, b) => a.ordenPdf - b.ordenPdf);

      const totalUnidadesPrestamo = itemsPrestamo.reduce((acc, entry) => acc + entry.cantidadNeta, 0);
      const movimientosEliminados = await tx.movimiento.deleteMany({
        where: {
          personalCi: ciDecoded,
          tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
        },
      });

      let prestamoGenerado: { prestamoId: string; reciboNumero: string; totalEquipos: number; totalUnidades: number } | null = null;
      if (itemsPrestamo.length > 0) {
        const movimientoPrestamo = await tx.movimiento.create({
          data: {
            tipo: TipoMovimiento.PRESTAMO,
            fecha: fechaAscenso,
            personalCi: ciDecoded,
            usuarioEntregaId: auth.user.usuarioId,
            afectaStock: true,
            observaciones: ASCENSO_COMENTARIO_PRESTAMO,
          },
          select: { movimientoId: true },
        });

        const provisionalRecibo = `TMP-${randomUUID()}`;
        await tx.prestamoActivo.create({
          data: {
            movimientoId: movimientoPrestamo.movimientoId,
            reciboNumero: provisionalRecibo,
            fechaEstimadaDevolucionTexto: ASCENSO_FECHA_ESTIMADA,
          },
        });

        const reciboNumero = `PR-${movimientoPrestamo.movimientoId.toString().padStart(8, "0")}`;
        await tx.prestamoActivo.update({
          where: { movimientoId: movimientoPrestamo.movimientoId },
          data: { reciboNumero },
        });

        await tx.movimientoItem.createMany({
          data: itemsPrestamo.map((entry) => ({
            movimientoId: movimientoPrestamo.movimientoId,
            itemId: entry.itemId,
            cantidad: entry.cantidadNeta,
            estadoEntrega: EstadoEquipoPrestamo.BUENO,
            comentarioEntrega: null,
          })),
        });

        prestamoGenerado = {
          prestamoId: movimientoPrestamo.movimientoId.toString(),
          reciboNumero,
          totalEquipos: itemsPrestamo.length,
          totalUnidades: totalUnidadesPrestamo,
        };
      }

      await tx.personal.update({
        where: { ci: ciDecoded },
        data: {
          tipo: TipoPersonal.SUBOFICIAL,
          rangoId: rangoDestino.rangoId,
        },
      });

      await tx.suboficial.upsert({
        where: { ci: ciDecoded },
        update: {},
        create: { ci: ciDecoded },
      });

      await tx.subalterno.deleteMany({
        where: { ci: ciDecoded },
      });

      return {
        persona,
        rangoDestino,
        movimientosEliminados: movimientosEliminados.count,
        itemsPrestamo: itemsPrestamo.map((entry) => ({
          itemId: entry.itemId.toString(),
          nombre: entry.nombre,
          cantidad: entry.cantidadNeta,
        })),
        totalUnidadesPrestamo,
        prestamoGenerado,
      };
    }, {
      maxWait: ASCENSO_TX_MAX_WAIT_MS,
      timeout: ASCENSO_TX_TIMEOUT_MS,
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: {
        evento: "ASCENSO_SARGENTO_A_SARGENTO_PRIMERO",
        ci: ciDecoded,
        nombre: `${result.persona.apellido1} ${result.persona.apellido2 ?? ""}, ${result.persona.nombre1} ${result.persona.nombre2 ?? ""}`
          .replace(/\s+/g, " ")
          .trim(),
        rangoAnterior: {
          rangoId: result.persona.rango.rangoId,
          abreviacion: result.persona.rango.abreviacion,
          nombreCompleto: result.persona.rango.nombreCompleto,
        },
        rangoNuevo: {
          rangoId: result.rangoDestino.rangoId,
          abreviacion: result.rangoDestino.abreviacion,
          nombreCompleto: result.rangoDestino.nombreCompleto,
        },
        movimientosVestuarioEliminados: result.movimientosEliminados,
        comentarioPrestamo: ASCENSO_COMENTARIO_PRESTAMO,
        fechaEstimadaDevolucionTexto: ASCENSO_FECHA_ESTIMADA,
        totalEquiposPrestamo: result.itemsPrestamo.length,
        totalUnidadesPrestamo: result.totalUnidadesPrestamo,
        prestamoGenerado: result.prestamoGenerado,
        itemsPrestamo: result.itemsPrestamo,
      },
    });

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    await Promise.allSettled([
      sendPersonalMovementEmailNotification({
        request,
        ci: ciDecoded,
        subject: "Notificacion de movimiento - Deposito ART1",
        headline: "Se registro un ascenso y ajuste de vestuario en tu ficha.",
        detailLines: [
          `Rango anterior: ${result.persona.rango.abreviacion} - ${result.persona.rango.nombreCompleto}`,
          `Rango nuevo: ${result.rangoDestino.abreviacion} - ${result.rangoDestino.nombreCompleto}`,
          `Movimientos de vestuario reemplazados: ${result.movimientosEliminados}`,
          result.prestamoGenerado
            ? `Prestamo generado: ${result.prestamoGenerado.reciboNumero} (${result.prestamoGenerado.totalUnidades} unidades)`
            : "No se genero prestamo por saldo neto cero",
        ],
        actorLabel,
        portalPath: "/",
      }),
    ]);

    return NextResponse.json({
      ok: true,
      ci: ciDecoded,
      rangoDestino: result.rangoDestino,
      movimientosVestuarioEliminados: result.movimientosEliminados,
      prestamoGenerado: result.prestamoGenerado,
    });
  } catch (error: unknown) {
    const prismaLike = error as { code?: string; message?: string };
    if (error instanceof AscensoError) {
      if (error.code === "PERSONA_NO_ENCONTRADA") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.code === "PERSONA_NO_SUBALTERNO" ||
        error.code === "RANGO_ORIGEN_INVALIDO" ||
        error.code === "RANGO_DESTINO_NO_ENCONTRADO"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (prismaLike?.code === "P2028" || prismaLike?.code === "P1008") {
      return NextResponse.json(
        { error: "La operacion demoro demasiado. Reintenta el ascenso en unos segundos." },
        { status: 503 },
      );
    }

    console.error("ascenso-sargento-primero: unexpected error", error);
    return NextResponse.json({ error: "No se pudo completar el ascenso." }, { status: 500 });
  }
}
