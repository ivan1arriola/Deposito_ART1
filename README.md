# Soldados App

Next.js + Prisma + PostgreSQL (Neon), con modelo en 3FN.

## Modelo de datos (3FN)

Tablas principales:

- `personal` (`ci` como PK)
- `grado` (catalogo)
- `bateria` (catalogo)
- `talla_tipo` (catalogo: PARKA, CAMISACO, PANTALON, KEPI, CALZADO)
- `personal_talla` (PK compuesta `ci + talla_tipo_id`)
- `item` (catalogo)
- `registro` (cabecera de ENTREGA/DEVOLUCION/AJUSTE)
- `registro_item` (detalle por item)
- `observacion` (texto por persona/fecha)
- `usuario` (usuarios de la app con rol)
- `sesion` (sesiones activas por cookie httpOnly)
- `auditoria` (registro de acciones por usuario)

## Variables de entorno

Configura en `.env`:

- `DATABASE_URL` (Neon pooler)
- `DATABASE_URL_UNPOOLED` (opcional)

## Comandos

```bash
npm install
npm run db:rebuild
npm run dev
```

`db:rebuild` elimina y recrea todo el esquema `public` desde `prisma/schema-base.sql` (incluye tablas, FKs, indices y checks).
La precarga base queda limitada a catalogos: grados, baterias, talla_tipo e items. No importa personal ni movimientos.

Crear/actualizar un usuario (incluye primer admin):

```bash
npm run user:create -- --username admin --password "Admin1234" --role ADMIN
```

## Endpoints actuales

- `GET /api/personal`
- `POST /api/personal`
- `PUT /api/personal/:ci`
- `DELETE /api/personal/:ci`
- `GET /api/rangos`
- `POST /api/rangos`
- `PUT /api/rangos/:rangoId`
- `DELETE /api/rangos/:rangoId`
- `GET /api/baterias`
- `POST /api/baterias`
- `PUT /api/baterias/:bateriaId`
- `DELETE /api/baterias/:bateriaId`
- `GET /api/items`
- `POST /api/items`
- `PUT /api/items/:itemId`
- `DELETE /api/items/:itemId`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/usuarios` (admin)
- `POST /api/usuarios` (admin)
- `PUT /api/usuarios/:usuarioId` (admin)
- `DELETE /api/usuarios/:usuarioId` (admin)
- `GET /api/auditoria` (admin)

### Ejemplo `POST /api/personal`

```json
{
  "ci": "45907815",
  "apellido1": "Perez",
  "apellido2": "Gomez",
  "nombre1": "Juan",
  "nombre2": "Carlos",
  "fechaIngreso": "2026-02-25",
  "rangoId": 3,
  "bateriaId": 1,
  "tallas": {
    "PARKA": "M",
    "CAMISACO": "M",
    "PANTALON": "34",
    "KEPI": "58",
    "CALZADO": "42"
  }
}
```

Tambien se admite el formato legado de tallas:
`tallaParka`, `tallaCamisaco`, `tallaPantalon`, `tallaKepi`, `tallaCalzado`.
