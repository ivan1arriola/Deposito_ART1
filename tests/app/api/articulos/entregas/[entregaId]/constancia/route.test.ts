import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/articulos/entregas/[entregaId]/constancia/route";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    articuloEntregaPersonal: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/articulos/entregas/[entregaId]/constancia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest() {
    return new Request("http://localhost:3000/api/articulos/entregas/301/constancia");
  }

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ entregaId: "301" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.articuloEntregaPersonal.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 404 si la entrega no existe", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);
    vi.mocked(prisma.articuloEntregaPersonal.findUnique).mockResolvedValue(null);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ entregaId: "301" }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Entrega no encontrada.");
  });

  it("genera un PDF para la constancia de entrega", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);
    vi.mocked(prisma.articuloEntregaPersonal.findUnique).mockResolvedValue({
      articuloEntregaPersonalId: BigInt("301"),
      fecha: new Date("2026-05-20T00:00:00.000Z"),
      createdAt: new Date("2026-05-20T13:45:00.000Z"),
      comentario: "Entrega semanal",
      personal: {
        ci: "12345672",
        apellido1: "Gomez",
        apellido2: null,
        nombre1: "Luis",
        nombre2: null,
        rango: { abreviacion: "Sdo." },
        bateria: true,
      },
      ordenante: {
        apellido1: "Lopez",
        apellido2: null,
        nombre1: "Mario",
        nombre2: null,
        rango: { abreviacion: "Cap." },
        bateria: true,
      },
      usuarioEntrega: {
        nombre: "Ana",
        apellido: "Perez",
        rango: { abreviacion: "Tte." },
        bateria: true,
      },
      movimientosStock: [
        {
          cantidad: 5,
          articulo: {
            nombre: "Block de Hojas A4",
            tipo: "OFICINA",
          },
        },
        {
          cantidad: 2,
          articulo: {
            nombre: "Lavandina",
            tipo: "LIMPIEZA",
          },
        },
      ],
    } as never);

    const res = await GET(createMockRequest(), {
      params: Promise.resolve({ entregaId: "301" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("Constancia_EA-00000301.pdf");

    const bytes = await res.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
