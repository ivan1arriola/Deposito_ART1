# 🎯 Diagrama Visual de Flujos y Arquitectura

---

## 📊 Diagrama de Casos de Uso

```
┌─────────────────────────────────────────────────────────────┐
│                      SOLDADOS APP                            │
│                   (Usuarios: Admin/Editor)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
          ┌─────────┐   ┌──────────┐   ┌──────────┐
          │ Personal│   │ Registros│   │  Fichas  │
          │ (CRUD)  │   │(ENTREGA) │   │          │
          └─────────┘   └──────────┘   └──────────┘
                │             │             │
                ├─ Ingresar   ├─ Registrar ├─ Ver Individual
                ├─ Buscar     ├─ Listar    ├─ Generar PDF
                ├─ Editar     ├─ Actualizar├─ Matriz
                ├─ Eliminar   └─ Eliminar  └─ Descargar
                └─ Asignar Tallas
                
          ┌──────────────┐  ┌──────────────┐
          │Observaciones │  │  Catálogos   │
          │              │  │              │
          ├─ Crear nota  ├─ Rangos
          ├─ Ver notas   ├─ Baterías
          ├─ Editar      ├─ Items
          └─ Eliminar    └─ Tallas (RO)
```

---

## 🔄 Flujo: Ingresar Nuevo Personal

```
┌──────────┐
│  Inicio  │
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│ Formulario Personal  │
│ - CI                 │
│ - Apellidos/Nombres  │
│ - Rango (dropdown)   │
│ - Batería (dropdown) │
│ - Tallas             │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Validar CI           │───NO───┐
│ (ciuy library)       │        │
└────┬─────────────────┘        │
     │YES                        │
     ▼                           │
┌──────────────────────┐        │
│ POST /api/personal   │        │
│ Body:                │        │
│ { ci, apellido1,     │        │
│   nombre1, taller }  │        │
└────┬─────────────────┘        │
     │                           │
     ▼                           │
┌──────────────────────┐        │
│ BD Transaction:      │        │
│ 1. Insert Personal   │        │
│ 2. Insert Tallas(5)  │        │
│ 3. Log Auditoria     │        │
└────┬─────────────────┘        │
     │                           │
     ▼                           ▼
┌─────────────┐       ┌──────────────────┐
│   Éxito     │       │   Error/Rechazo  │
│ ✅ Creado   │       │   ❌ Mostrar msg  │
└─────────────┘       └──────────────────┘
                             │
                             ▼
                      └─── Reintentar
```

---

## 📦 Flujo: Registrar Entrega de Vestuario

```
┌──────────┐
│  Inicio  │
└────┬─────┘
     │
     ▼
┌────────────────────────┐
│ Buscar Personal        │
│ - Campo CI (autocomplete)
│ - Selector dropdown    │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ Seleccionar Fecha      │
│ - Date picker          │
│ - Default: hoy         │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ Marcar Items           │
│ ☐ Parka Pixelada  [1]  │
│ ☐ Pantalón 4A     [1]  │
│ ☐ Camisaco Eq.    [1]  │
│ ☐ Botas (cuero)   [1]  │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ Agregar Comentario     │
│ (opcional)             │
│ [Textarea]             │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ POST /api/registros    │
│ Body:                  │
│ { ci, fecha,           │
│   tipo: "ENTREGA",     │
│   items: [{id,qty}...] │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ BD Transaction:        │
│ 1. Insert Registro     │
│ 2. Insert RegistroItem │
│    (1 x item)         │
│ 3. Log Auditoria       │
└────┬───────────────────┘
     │
     ▼
┌──────────────────────┐
│   ✅ Exportación OK  │
│   Ficha actualizada  │
└──────────────────────┘
```

---

## 🖨️ Flujo: Generar Ficha Individual + PDF

```
┌──────────┐
│  Inicio  │
└────┬─────┘
     │
     ▼
┌────────────────────────┐
│ Seleccionar Personal   │
│ (dropdown o búsqueda)  │
│ Ej: "Perez, Juan (CI)" │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ GET /api/ficha/:ci     │
│ Parser JSON a Ficha    │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ Renderizar UI:         │
│ ┌──────────────────┐   │
│ │ Datos Personales │   │
│ │ CI / Rango       │   │
│ │ Batería / Tallas │   │
│ ├──────────────────┤   │
│ │ Historial        │   │
│ │ Fecha  │ Tipo    │   │
│ │ Items  │ Cant.   │   │
│ └──────────────────┘   │
│ [Button Descargar PDF] │
└────┬───────────────────┘
     │
     ▼ (Click botón)
┌────────────────────────┐
│ GET /api/pdf-ficha/:ci │
│ - Lee datos ficha      │
│ - Crea PDF en memoria  │
│ - Retorna binario      │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ Browser descarga:      │
│ Ficha_45907815.pdf     │
└────────────────────────┘
```

---

## 📊 Flujo: Vista Matriz de Entregas

```
┌──────────┐
│  Inicio  │
└────┬─────┘
     │
     ▼
┌────────────────────────┐
│ GET /api/hoja-matrix   │
│ Retorna:               │
│ - Personas (78 rows)   │
│ - Items (28 cols)      │
│ - Entregas (matriz)    │
└────┬───────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│  Renderizar Tabla              │
│                                  │
│  Persona  │ Parka │ Pantalón│... │
│  ─────────┼───────┼─────────┤    │
│  Perez, J │  1  │   1    │ 28 │
│  Gomez, A │  1  │   1    │ 27 │
│  Ruiz, P  │  0  │   1    │ 26 │
│  ...      │  ... │  ...   │... │
│                                  │
│  Color Code:                     │
│  🟢 Verde  = 1 (OK)            │
│  🟡 Amarillo = 0 (Falta)       │
│  🔴 Rojo   = 2+ (Exceso)       │
└─────────────────────────────────┘
     │
     ▼
┌────────────────────────┐
│ Filtros (opcional)     │
│ [Rango dropdown]       │
│ [Bateria dropdown]     │
│ [Búsqueda CI]          │
│ Actualizar tabla       │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────┐
│ Botón Descargar PDF    │
│ GET /api/pdf-matriz    │
│ Retorna PDF tabla      │
└────────────────────────┘
```

---

## 🗄️ Diagrama: Flujo de Datos en BD

```
┌──────────────────────────────────────────────────────────┐
│                    TABLE: personal                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ci (PK)  │ apellido1  │ nombre1  │ rangoId (FK)    │ │
│  │ 45907815 │ Perez      │ Juan     │ 2 (Cabo 1°)    │ │
│  │ 56876110 │ Acuña      │ Mauricio │ 4 (Sdo 1°)     │ │
│  │ ...      │ ...        │ ...      │ ...            │ │
│  └─────────────────────────────────────────────────────┘ │
│    │                    │
│    │ (1:M)              ▼
│    │          ┌────────────────────┐
│    │          │   TABLE: grado     │
│    │          │ (Rango)            │
│    │          ├────────────────────┤
│    │          │ rangoId (PK)       │
│    │          │ abreviacion (UQ)   │
│    │          │ nombreCompleto (UQ)│
│    │          │ ─────────────────  │
│    │          │ 1 │ SGTO │ Sargento│
│    │          │ 2 │ CABO1│ Cabo 1° │
│    │          │ 3 │ CABO2│ Cabo 2° │
│    │          │ 4 │ SDO1 │ Sdo 1°  │
│    │          └────────────────────┘
│    │
│    └──────┐
│           │ (1:M)
│           ▼
│  ┌──────────────────────────────────────┐
│  │   TABLE: personal_talla              │
│  │   (FK: ci, tallaTipoId)             │
│  │                                      │
│  │  ci       │ tallaTipoId │ tallaValor│
│  │  45907815 │ 1           │ M        │
│  │  45907815 │ 3           │ 34       │
│  │  45907815 │ 4           │ 58       │
│  │  ...      │ ...         │ ...      │
│  └──────────────────────────────────────┘
│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  TABLE: registro                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │ registroId│ ci (FK)  │ fecha  │ tipo   │ comentar│   │
│  │ 1         │ 45907815 │ 26feb  │ENTREGA│ Inicial │   │
│  │ 2         │ 56876110 │ 26feb  │ENTREGA│ Inicial │   │
│  │ 3         │ 45907815 │ 01mar  │DEVOLU │ Dañado  │   │
│  │ ...       │ ...      │ ...    │ ...    │ ...     │   │
│  └───────────────────────────────────────────────────┘   │
│    │ (1:M)                                               │
│    └──────────┐                                           │
│               ▼                                           │
│  ┌──────────────────────────────────────┐                │
│  │   TABLE: registro_item               │                │
│  │  ┌────────────────────────────────┐  │                │
│  │  │registroId│ itemId (FK)│cantidad│  │                │
│  │  │1         │ 5          │ 1     │  │                │
│  │  │1         │ 15         │ 1     │  │                │
│  │  │2         │ 5          │ 1     │  │                │
│  │  │3         │ 5          │ 1     │  │  DEVOLUCION    │
│  │  │...       │ ...        │ ...   │  │                │
│  │  └────────────────────────────────┘  │                │
│  │    │ (FK)                            │                │
│  │    └───┐                             │                │
│  │        ▼                             │                │
│  │  ┌──────────────────┐                │                │
│  │  │  TABLE: item     │                │                │
│  │  │ itemId (PK)      │                │                │
│  │  │ nombre           │                │                │
│  │  │ ─────────────────│                │                │
│  │  │ 5│Parka Pixelada│                │                │
│  │  │15│Pantalón 4A   │                │                │
│  │  │..│...           │                │                │
│  │  └──────────────────┘                │                │
│  └──────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo: Autenticación y Auditoría

```
┌──────────┐
│  Login   │
│ [Form]   │
└────┬─────┘
     │ POST /api/auth/login
     │ { username, password }
     ▼
┌──────────────────┐
│ BD: usuario      │
│ Validar pwd hash │
├──────────────────┤
│ Si válido:       │
│ - Crear sesión   │
│ - Generar token  │
│ - httpOnly cookie│
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Log Auditoria:   │
│ usuario_id: 123  │
│ accion: "login"  │
│ fecha: now       │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Usuario autenticado
│ Token válido     │
│ Roles: ADMIN     │
└──────────────────┘

Cada acción CRUD genera log:
┌──────────────────────────────┐
│ INSERT auditorias             │
├──────────────────────────────┤
│ usuario_id: 123              │
│ accion: "CREATE"             │
│ entidad: "personal"          │
│ entidadId: "45907815"        │
│ detalle: { JSON de cambios } │
│ createdAt: 2026-02-26...     │
└──────────────────────────────┘
```

---

## 📱 Página Principal - Layout

```
┌──────────────────────────────────────────────┐
│  SOLDADOS APP  [👤 admin]  [🔓 Logout]       │
├────────────────┬──────────────────────────────┤
│                │                              │
│   NAVEGACIÓN   │     CONTENIDO PRINCIPAL      │
│   ─────────    │     ─────────────────────    │
│                │                              │
│ ✓ Personal     │  ╔════════════════════════╗  │
│ ✓ Registros    │  ║ VISTA SELECCIONADA:   ║  │
│ ✓ Fichas       │  ║                        ║  │
│ ✓ Matriz       │  ║  - Datos              ║  │
│ ✓ Observ.      │  ║  - Tablas             ║  │
│ ─────────────  │  ║  - Formularios        ║  │
│ ⚙️ Config (A)  │  ║  - Botones            ║  │
│                │  ║                        ║  │
│                │  ╚════════════════════════╝  │
│                │                              │
└────────────────┴──────────────────────────────┘
```

---

## 📈 Timeline de Implementación

```
DÍA 1: Base
├─ Verificar endpoints actuales ✓
├─ Crear GET /api/ficha/:ci
├─ Testear endpoint
└─ Crear componente básico

DÍA 2: PDF
├─ Crear GET /api/pdf-ficha/:ci
├─ Testear descarga PDF
└─ Integrar en componente

DÍA 3: Matriz
├─ Crear GET /api/hoja-matrix
├─ Componente MatrizView
└─ Exportar PDF matriz

DÍA 4: Observaciones
├─ CRUD endpoints
├─ UI component
└─ Integración en ficha

DÍA 5-6: Datos Legacy
├─ Scripts de importación
├─ Validación de datos
└─ Test en staging

DÍA 7: Polish
├─ UI/UX refinement
├─ Performance
└─ Deploy
```

---

## 🎯 Checklist Visual: Qué Falta

```
ENDPOINTS API
├─ ✅ GET /api/personal
├─ ✅ POST /api/personal
├─ ✅ PUT /api/personal/:ci
├─ ✅ DELETE /api/personal/:ci
├─ ✅ GET /api/rangos
├─ ✅ POST /api/rangos
├─ ✅ PUT /api/rangos/:id
├─ ✅ DELETE /api/rangos/:id
├─ ✅ GET /api/items
├─ ✅ POST /api/items
├─ ✅ GET /api/registros
├─ ✅ POST /api/registros
│
├─ ❌ GET /api/ficha/:ci ..................... [TODO]
├─ ❌ GET /api/pdf-ficha/:ci ................. [TODO]
├─ ❌ GET /api/hoja-matrix ................... [TODO]
├─ ❌ GET /api/pdf-matriz .................... [TODO]
├─ ❌ GET /api/observaciones/:ci ............ [TODO]
├─ ❌ POST /api/observaciones ............... [TODO]
└─ ❌ PUT /api/observaciones/:id ............ [TODO]

COMPONENTES REACT
├─ ✅ Personal CRUD view
├─ ✅ Registros view
│
├─ ❌ FichaIndividualView ................... [TODO]
├─ ❌ MatrizEntregasView ................... [TODO]
├─ ❌ ObservacionesPanel ................... [TODO]
└─ ❌ RegistroDetallado .................... [TODO]

DATOS
├─ ❌ Importar CSV personal ................. [TODO]
├─ ❌ Importar CSV registros ............... [TODO]
└─ ❌ Validar integridad datos ............. [TODO]
```

---

**Diagrama actualizado: 26/02/2026**

