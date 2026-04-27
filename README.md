# Deposito ART1

Sistema web para la gestion del Deposito General del Grupo de Artilleria 105mm No. 1.
Construido con Next.js, Prisma y PostgreSQL.

## Estado del Proyecto

- Nombre del paquete: `deposito-art1`
- Version actual: `2.0.0`
- Licencia del proyecto: `Apache-2.0`

## Stack Tecnologico

- Next.js 16
- React 19
- Prisma ORM
- PostgreSQL
- NextAuth
- Tailwind CSS 4
- Vitest

## Requisitos

- Node.js 20+
- npm 10+
- Base de datos PostgreSQL

## Configuracion Inicial

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo `.env` con al menos:

```env
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..." # opcional

# Requerido para notificaciones push admin (Chrome/Android)
WEB_PUSH_PUBLIC_KEY="..."
WEB_PUSH_PRIVATE_KEY="..."
WEB_PUSH_SUBJECT="mailto:admin@example.com"

# Opcional: habilita autenticacion de Soldado Widget
SOLDADO_WIDGET_AUTH_SECRET="secreto_largo_y_unico"
# Opcional: expiracion del token de sesion en horas (default: 720 = 30 dias)
# Usa 0 para sesion sin vencimiento practico (expira en 2100)
SOLDADO_WIDGET_TOKEN_TTL_HOURS="720"

# Opcional: tamano de lote para generar PDF consolidado de hojas de entrega
# Default: 50 | Rango valido: 1..300
HOJAS_ENTREGA_PDF_FAST_BATCH_CHUNK_SIZE="50"
```

Para generar claves VAPID:

```bash
npm run webpush:generate
```

3. Generar esquema y cliente Prisma:

```bash
npm run db:rebuild
```

4. Levantar entorno de desarrollo:

```bash
npm run dev
```

## Scripts Disponibles

- `npm run dev`: inicia Next.js en desarrollo
- `npm run build`: build de produccion
- `npm run start`: inicia la app compilada
- `npm run lint`: ejecuta ESLint
- `npm run test`: ejecuta tests con Vitest
- `npm run test:ui`: interfaz de Vitest
- `npm run test:coverage`: cobertura de tests
- `npm run refactor:scan`: analiza hotspots y puntaje de riesgo de refactorizacion
- `npm run refactor:scan:json`: genera reporte JSON en `reports/refactor-metrics.json`
- `npm run refactor:gate`: igual que scan, pero retorna error si detecta riesgo ALTO/CRITICO
- `npm run db:rebuild`: recrea esquema `public` usando `prisma/schema-base.sql`
- `npm run db:patch:drop-caja-cantidad`: elimina la columna derivada `caja.cantidad` en BD existente y regenera Prisma Client
- `npm run db:patch:add-caja-piso-fk`: agrega/backfillea `caja.piso`, aplica FK compuesta `caja(estanteria,piso)->estanteria(codigo,piso)` y regenera Prisma Client
- `npm run prisma:generate`: regenera cliente Prisma
- `npm run prisma:studio`: abre Prisma Studio
- `npm run user:create -- --username <u> --password <p> --role ADMIN|EDITOR`: crea o actualiza usuario
- `npm run webpush:generate`: genera claves VAPID para notificaciones push

## Extension Soldado Widget

Si defines `SOLDADO_WIDGET_AUTH_SECRET` (o ya tienes `NEXTAUTH_SECRET`), se habilitan los endpoints:

- `POST /api/extensions/soldado-widget/login`
- `GET /api/extensions/soldado-widget/recordatorios?limit=3`

Flujo:

- La app Android envia `username` + `password` al endpoint de login.
- El servidor devuelve `accessToken` de sesion y datos del usuario.
- El widget usa `Authorization: Bearer <accessToken>` para sincronizar recordatorios del usuario autenticado.

Respuesta:

- resumen con pendientes/urgentes
- lista acotada de tareas para mostrar en el widget Android

Ejemplo:

```bash
npm run user:create -- --username admin --password "Admin1234" --role ADMIN
```

## Modelo de Datos (resumen)

Tablas principales:

- `personal`
- `grado`
- `bateria`
- `talla_tipo`
- `personal_talla`
- `grado_mando`
- `oficial_suboficial`
- `oficial_suboficial_talla`
- `prestamo`
- `prestamo_item`
- `item`
- `registro`
- `registro_item`
- `observacion`
- `usuario`
- `sesion`
- `auditoria`

## Licencia y Compatibilidad

Este proyecto se distribuye bajo licencia `Apache-2.0`, que permite uso comercial, modificacion, distribucion y uso privado.

Revision de compatibilidad realizada el 2026-03-08 sobre dependencias directas:

- MIT
- ISC
- BSD-3-Clause
- Apache-2.0

Estas licencias son permisivas y compatibles con distribuir esta aplicacion bajo `Apache-2.0`.

Nota: cada dependencia mantiene su propia licencia y condiciones.

## Nota Legal

Este README no constituye asesoria legal. Si necesitas una validacion formal para un entorno comercial regulado, consulta con asesoria juridica.
