import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildInternalUserEmail } from "@/lib/internal-user-email";

/**
 * Endpoint para inicializar la base de datos con un usuario administrador por defecto
 * Se ejecuta una sola vez cuando no hay usuarios en el sistema
 * No requiere autenticación
 */
export async function POST() {
  try {
    // Contar usuarios existentes
    const userCount = await prisma.usuario.count();

    if (userCount > 0) {
      return Response.json({ initialized: false, message: "Ya existe usuario en el sistema." }, { status: 200 });
    }

    // Crear usuario administrador por defecto
    const defaultPassword = "Admin@123456";
    const passwordHash = await hashPassword(defaultPassword);

    const defaultUser = await prisma.usuario.create({
      data: {
        username: "admin",
        email: buildInternalUserEmail("admin"),
        passwordHash,
        rol: "ADMIN",
        activo: true,
      },
      select: {
        usuarioId: true,
        username: true,
        rol: true,
      },
    });

    // Registrar en auditoría
    await logAudit({
      usuarioId: defaultUser.usuarioId,
      accion: "DB_INIT",
      entidad: "ADMIN",
      entidadId: defaultUser.usuarioId,
      detalle: {
        mensaje: "Usuario administrador por defecto creado automáticamente",
        username: defaultUser.username,
      },
    });

    return Response.json(
      {
        initialized: true,
        message: `Base de datos inicializada. Usuario creado: ${defaultUser.username}`,
        user: defaultUser,
        credentials: {
          username: "admin",
          password: defaultPassword,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json({ initialized: false, error: message }, { status: 500 });
  }
}

/**
 * Endpoint GET para verificar si la BD necesita inicialización
 */
export async function GET() {
  try {
    const userCount = await prisma.usuario.count();
    return Response.json({ needsInit: userCount === 0, userCount }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return Response.json({ error: message }, { status: 500 });
  }
}
