# 📊 Dashboard de Reconstrucción - Resumen Ejecutivo

**Estado Actual y Plan de Trabajo**
**Fecha:** 26 de febrero de 2026

---

## 🎯 MISIÓN

Reconstruir la **Soldados APP** desde su versión en Google Sheets a una **aplicación web moderna** (Next.js + Prisma + PostgreSQL) manteniendo todas las funcionalidades y agregando mejoras.

---

## 📈 ESTADO GENERAL

```
Completitud Actual:    ████░░░░░░ 40%
Funcionalidad:         ████░░░░░░ 35%
Código Limpio:         ██████░░░░ 60%
Documentación:         ███░░░░░░░ 30%
```

---

## ✅ FUNCIONALIDADES COMPLETADAS

- [x] **Autenticación** (Login/Logout)
- [x] **CRUD Catálogos** (Rangos, Baterías, Items)
- [x] **CRUD Personal** (Datos básicos)
- [x] **Tallas** (Schema + relaciones)
- [x] **Registros** (Creación básica)
- [x] **Auditoría** (Sistema de logs)
- [x] **Validación de CIs** (librería ciuy integrada)

---

## ❌ FUNCIONALIDADES FALTANTES (CRÍTICAS)

| # | Funcionalidad | Prioridad | Esfuerzo | Estado |
|---|---|---|---|---|
| 1 | **Ficha Individual + PDF** | 🔴 ALTA | 2-3h | ⬜ TODO |
| 2 | **Matriz de Entregas** | 🟡 MEDIA | 2h | ⬜ TODO |
| 3 | **PDF Matriz** | 🟡 MEDIA | 1h | ⬜ TODO |
| 4 | **Observaciones UI** | 🟠 BAJA | 1h | ⬜ TODO |
| 5 | **Corrección de CIs** | 🟠 BAJA | 1h | ⬜ TODO |
| 6 | **Búsqueda Avanzada** | 🟠 BAJA | 1.5h | ⬜ TODO |
| 7 | **Importación Datos Legacy** | 🟡 MEDIA | 2h | ⬜ TODO |

---

## 🏗️ ARQUITECTURA DE LA APP

```
┌─────────────────────────────────────────────────────────────┐
│                     SOLDADOS APP                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │  Base Datos  │      │
│  │  Next.js 16  │  │  Next.js API │  │ PostgreSQL   │      │
│  │   React 19   │  │   Prisma ORM │  │   (Neon)     │      │
│  │ TypeScript   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Personal   │  │   Registros  │  │ Observaciones│      │
│  │   (CRUD)     │  │  Distribuciones│ (Notas)       │      │
│  │   CI único   │  │   Entregas    │  │ Por Persona  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Fichas     │  │    Matriz    │  │  Auditoría   │      │
│  │  Individual  │  │  Entregas    │  │   (Logs)     │      │
│  │   + PDF      │  │   Personas   │  │   Por User   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 ENTIDADES DE DATOS

```
Personal (ci: PK)
├─ apellido1, apellido2
├─ nombre1, nombre2
├─ fechaIngreso
├─ FK: rangoId (Rango)
├─ FK: bateriaId (Bateria)
└─ has_many: PersonalTalla, Registro, Observacion
   │
   ├─ PersonalTalla
   │  └─ FK: tallaTipoId (TallaTipo: PARKA, CAMISACO, PANTALON, KEPI, CALZADO)
   │
   ├─ Registro (cabecera: ENTREGA/DEVOLUCION/AJUSTE)
   │  └─ has_many: RegistroItem
   │     └─ FK: itemId (Item: tipos de prendas)
   │
   └─ Observacion (notas por fecha)

Otros Catálogos:
├─ Rango (SGTO, CABO1, CABO2, SDO1)
├─ Bateria (Cdo. y Serv., ...)
├─ Item (28+ tipos de prendas)
├─ TallaTipo (5 tipos)

Seguridad:
├─ Usuario (auth, rolesADMIN/EDITOR)
├─ Sesion (httpOnly tokens)
└─ Auditoria (logs de cambios)
```

---

## 🔄 FLUJOS PRINCIPALES

### Flujo 1: Ingresar Personal
```
1. Cargar formulario
2. Validar CI (ciuy)
3. Seleccionar rango + bateria
4. Asignar tallas (PARKA, etc)
5. POST /api/personal
   ├─ Crear Personal
   ├─ Crear PersonalTalla (5 registros)
   └─ Log auditoría
6. Confirmación
```

### Flujo 2: Registrar Entrega
```
1. Seleccionar personal por CI
2. Seleccionar fecha
3. Marcar items:
   - Parka: Pixelada 4A (qty=1)
   - Camisaco: Eq.Pixelado (qty=1)
   - ...
4. Guardar comentario (opcional)
5. POST /api/registros
   ├─ Crear Registro (cabecera)
   ├─ Crear RegistroItem (1 por item)
   └─ Log auditoría
6. Confirmación
```

### Flujo 3: Ver Ficha Individual
```
1. Buscar personal por CI
2. GET /api/ficha/:ci
   ├─ Obtener Personal + Rango + Bateria
   ├─ Obtener PersonalTalla (tallas)
   └─ Obtener Registros (historial)
3. Renderizar en UI
4. Opción: Descargar PDF
   └─ GET /api/pdf-ficha/:ci → PDF binario
```

### Flujo 4: Ver Matriz de Entregas
```
1. GET /api/hoja-matrix
   ├─ Listar todas personas + tallas
   ├─ Listar todos items
   └─ Calcular total entregas por persona x item
2. Renderizar tabla
   - Filas: personal
   - Columnas: items
   - Celdas: cantidad entregada (color-coded)
3. Opción: Descargar PDF de matriz
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### FASE 1: Consolidar Bases (1 día)
- [ ] Verificar endpoints `/api/personal` CRUD
- [ ] Verificar endpoints `/api/registros` CRUD
- [ ] Validar schema.prisma contra realidad
- [ ] Revisar tipos TypeScript
- [ ] Test básico de cada endpoint
- [ ] Documentar endpoints en README

### FASE 2: Fichas Individuales (1 día)
- [ ] Crear endpoint `GET /api/ficha/:ci`
- [ ] Crear endpoint `GET /api/pdf-ficha/:ci`
- [ ] Componente `FichaIndividualView.tsx`
- [ ] Integrar en vista principal
- [ ] CSS/Tailwind para ficha
- [ ] Test: Generar 5 fichas sample

### FASE 3: Matriz de Entregas (1 día)
- [ ] Crear endpoint `GET /api/hoja-matrix`
- [ ] Componente `MatrizEntregasView.tsx`
- [ ] Tabla con colores
- [ ] Filtros (rango, bateria)
- [ ] Endpoint PDF (`GET /api/pdf-matriz`)
- [ ] Test: Validar números en matriz

### FASE 4: Características Secundarias (1-2 días)
- [ ] Observaciones: CRUD + UI
- [ ] Herramienta corrección CIs
- [ ] Búsqueda avanzada
- [ ] Paginación en listas
- [ ] Ordenamiento de columnas

### FASE 5: Migración de Datos (1 día)
- [ ] Script `import-personal-legacy.mjs`
- [ ] Script `import-registros-legacy.mjs`
- [ ] Validación de integridad
- [ ] Reporte de discrepancias
- [ ] Test en BD staging
- [ ] Rollback scripts

### FASE 6: Polish y Deploy (1 día)
- [ ] Revisar UI/UX
- [ ] Performance optimization
- [ ] SEO + metadata
- [ ] Tests end-to-end
- [ ] Documentation final
- [ ] Deployment checklist

**Total estimado:** 6-7 días de trabajo

---

## 🎨 VISTA PREVISTA DE LA APP

### Vista Principal
```
┌────────────────────────────────────────────────────┐
│  📋 SOLDADOS APP  [Usuario: admin]  [Logout]      │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Menú Lateral ─────┐  ┌─ Contenido Principal ─┐│
│  │                     │  │                        ││
│  │ ✔️ Personal         │  │ 👤 Gestión de Personal│
│  │ ✔️ Registros        │  │  ┌────────────────┐   ││
│  │ ✔️ Ficha Individual │  │  │ Buscar: [____] │   ││
│  │ ✔️ Matriz Entregas  │  │  └────────────────┘   ││
│  │ ✔️ Observaciones   │  │                        ││
│  │ ✔️ Config (Admin)   │  │ [+ Nuevo Personal]    ││
│  │                     │  │                        ││
│  │                     │  │ Tabla: Personal        ││
│  │                     │  │ ┌──────────────────┐   ││
│  │                     │  │ │ CI │ Rango │ ... │   ││
│  │                     │  │ ├──────────────────┤   ││
│  │                     │  │ │ 45907815 │ SGTO │ ... ││
│  │                     │  │ │ 56876110 │ SDO1 │ ... ││
│  │                     │  │ └──────────────────┘   ││
│  │                     │  │                        ││
│  └─────────────────────┘  └────────────────────────┘│
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Target | Estado |
|---------|--------|--------|
| **Endpoints implementados** | 15+ | ⚠️ ~8 |
| **Componentes React** | 10+ | ⚠️ ~4 |
| **Cobertura de TypeScript** | 100% | ⚠️ ~80% |
| **Test coverage** | >70% | ❌ 0% |
| **Documentación** | Completa | ⚠️ 60% |
| **Tiempo carga home** | <2s | ⚠️ ~3s |
| **Datos migrados** | ~78 personal | ❌ 0 |

---

## 🚀 SIGUIENTE SESIÓN

1. **Revisar** endpoints actuales en `/api` (quién está completo)
2. **Crear** endpoint `/api/ficha/:ci`
3. **Crear** endpoint `/api/pdf-ficha/:ci`
4. **Crear** componente `FichaIndividualView`
5. **Integrar** en `page.tsx`

---

## 📚 DOCUMENTOS GENERADOS

```
Soldados_APP/
├── RECONSTRUCCION_APP.md          ← Análisis completo
├── PLAN_MIGRACION_DATOS.md        ← Scripts de migración
├── COMPONENTES_E_IMPLEMENTACION.md ← Código detallado
├── ROADMAP_EJECUCION.md           ← Este documento
```

---

## 🔗 REFERENCIAS RÁPIDAS

- **Stack:** Next.js 16 + Prisma 6 + PostgreSQL
- **CI:** `ciuy` library (built-in)
- **PDF:** `pdf-lib` + `jspdf` (ya installed)
- **Auth:** JWT + Sessions httpOnly
- **Roles:** ADMIN, EDITOR
- **Timezone:** America/Montevideo

---

## 💡 NOTAS IMPORTANTES

1. **Datos Legacy** en `DATOS VIEJOS/` → 78 personas, ~226 movimientos
2. **Código Viejo** en `CODIGOVIEJO/` → Google Apps Script (referencia)
3. **Schema Base** en `prisma/schema-base.sql` → SQL puro, no migraciones
4. **Variables Env** requieren `DATABASE_URL` (Neon pooler)
5. **Scripts** en `/scripts` para crear usuarios e importar datos

---

**Última actualización:** 26/02/2026
**Responsable:** Sistema de Reconstrucción

