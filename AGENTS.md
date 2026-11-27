# Instrucciones para Agentes (Gemini 4 & Codex)

Lee y sigue estrictamente la especificación de arquitectura, roles, tiers, reglas del proyecto y gates de verificación definida en [`agent.md`](./agent.md).

## Reglas operativas del repositorio

App Next.js 16 / React 19 / TypeScript / Prisma 7. Tratar personal, inventario, préstamos y reportes de impresión como lógica de negocio sensible.

### Antes de editar

- Leer la ruta afectada, sus callers, el esquema Prisma y los tests relacionados.
- Preservar autorización, trazabilidad de auditoría, registros históricos y borrado lógico.
- Nunca modificar datos de base de datos productiva ni ejecutar migraciones sin autorización explícita.
- En reportes de personal activo, excluir registros con `baja: true`, manteniendo accesibles las transacciones históricas.

### Verificación y dependencias

- Instalar exactamente desde lockfile en CI: `npm ci`.
- Generar cliente Prisma: `npm run prisma:generate`.
- Ejecutar la batería estricta: `npm run qa:strict` (`typecheck`, `lint`, `format:check`, `dep:check`, `knip`, `check:encoding`, `check:spanish`, `refactor:gate`, `check:security` y `npx vitest run --coverage`).
- Mantener sincronizados `package.json` y `package-lock.json` y no commitear credenciales ni código generado de Prisma.
