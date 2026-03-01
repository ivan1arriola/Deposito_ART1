# 📋 Reconstrucción de Soldados APP

**Fecha de análisis:** 26 de febrero de 2026

---

## 📊 Resumen Ejecutivo

La app original era un **gestor de personal militar en Google Sheets** que registraba datos de soldados, su vestuario y movimientos. La nueva versión es una **aplicación Next.js con Prisma + PostgreSQL** que debe migrar y expandir estas funcionalidades.

---

## 🏛️ ARQUITECTURA ACTUAL

### Stack Tecnológico
- **Frontend:** Next.js 16.1.6 + React 19 + TypeScript
- **Backend:** Next.js API Routes
- **Base de Datos:** PostgreSQL (Neon) con Prisma ORM
- **Autenticación:** JWT + Sessions
- **Validación:** ciuy (cédulas uruguayas)

### Estructura de Datos (schema.prisma)

```
Tablas principales:
├── Usuario (auth/roles)
├── Personal (ci, datos personales, referencias a rango/bateria)
├── PersonalTalla (relación M:N personal ↔ talla_tipo)
├── Registro (movimientos de items: ENTREGA/DEVOLUCION/AJUSTE)
├── RegistroItem (detalle de cada item en el registro)
├── Observacion (notas por persona)
├── Rango (Sgto, Cabo 1°, Cabo 2°, Sdo 1°)
├── Bateria (unidades organizacionales)
├── Item (prendas: parka, pantalón, kepi, etc.)
├── TallaTipo (PARKA, CAMISACO, PANTALON, KEPI, CALZADO)
├── Sesion (autenticación)
├── Auditoria (trazabilidad)
└── PasswordResetCode (recuperación de contraseña)
```

---

## 🔍 FUNCIONALIDADES DEL CÓDIGO VIEJO

### 1. **Gestión de Personal** (`IngresarPersonal.js`)
```javascript
// Registrar nuevo soldado
✓ Validar CI uruguaya
✓ Procesar datos: rango, apellidos, nombres, fecha de ingreso, batería
✓ Asignar tallas (parka, camisaco, pantalón, kepi, calzado)
✓ Agregar a hoja "Datos Personales"
✓ Aplicar colores para las tallas
```

**Estado actual:** API `/api/personal` implementada parcialmente

---

### 2. **Generación de Fichas Individuales** (`Fichas.js`)
```javascript
// Generar ficha individual por soldado
✓ Crear hoja nueva con plantilla
✓ Completar datos personales
✓ Insertar historial de distribuciones
✓ Insertar historial de devoluciones
✓ Crear hyperlink en resumen
✓ Generar PDF
```

**Estado actual:** NO IMPLEMENTADO. Necesita:
- API para generar ficha (datos + historial)
- Plantilla HTML/PDF con datos del soldado
- Endpoint para descargar PDF

---

### 3. **Gestión de Vestuario** (`DistribucionEntrega.js`, `ExtraerDatosVestuario.js`)
```javascript
// Registrar distribuciones y entregas
✓ Seleccionar persona por CI
✓ Registrar fecha
✓ Registrar cantidad de items (parka, pantalón, etc.)
✓ Guardar en tabla "Vestuario"

// Extraer datos de hojas antiguas
✓ Leer CI de cada hoja
✓ Extraer movimientos de vestuario
✓ Procesar distribuciones vs entregas
✓ Validar y agregar a tabla centralizada
```

**Estado actual:** API `/api/registros` implementada parcialmente

---

### 4. **Validación de Cédulas** (`Cedulas.js`)
```javascript
// Validar CI
✓ Validar formato Uruguayo (8 dígitos + 1 verificador)
✓ Corregir CIs inválidas
✓ Actualizar en hoja de resumen y vestuario
✓ Regenerar fichas afectadas
```

**Estado actual:** Librera `ciuy` ya integrada en el proyecto

---

### 5. **Matriz de Entregas (Hoja Matrix)** (`Fichas.js`)
```javascript
// Generar matriz: personas x items
✓ Mostrar stock actual por persona
✓ Código de colores: entregar/mantener/verificar
✓ PDF para impresión
```

**Estado actual:** NO IMPLEMENTADO. Necesita endpoint `/api/hoja-matrix`

---

### 6. **Observaciones** (Comentarios)
```javascript
// Registrar notas por persona
✓ Persona + fecha + observación
✓ Tabla centralizada de comentarios
```

**Estado actual:** Schema existe pero NO tiene endpoints

---

### 7. **Auditoría**
```javascript
// USO EN VIEJO: Logs manuales
// NUEVO: Tabla auditoria con usuario, acción, entidad, fecha
```

**Estado actual:** Schema existe, endpoints implementados

---

## 📋 MAPA DE FUNCIONALIDADES

| Funcionalidad | Código Viejo | Estado Actual | Prioridad |
|---|---|---|---|
| **Auth (Login/Logout)** | Manual en GSheet | ✅ Implementado | CRÍTICA |
| **CRUD Personal** | `IngresarPersonal.js` | ⚠️ Parcial | CRÍTICA |
| **CRUD Tallas** | Columnas en resumen | ✅ Schema OK | ALTA |
| **CRUD Items** | La tabla de vestuario | ✅ Endpoints OK | ALTA |
| **Registros (ENTREGA/DEVOLUCION)** | `DistribucionEntrega.js` | ⚠️ Parcial | CRÍTICA |
| **Ficha Individual** | `Fichas.js` | ❌ NO | ALTA |
| **PDF Ficha** | Descarga desde GSheet | ❌ NO | ALTA |
| **Matriz De Entregas** | Hoja especial | ❌ NO | MEDIA |
| **PDF Matriz** | Descarga desde GSheet | ❌ NO | MEDIA |
| **Validar CI** | `Cedulas.js` | ✅ Integrada | BAJA |
| **Corregir CI Inválida** | `Cedulas.js` | ❌ NO | BAJA |
| **Observaciones** | Hoja comentarios | ✅ Schema, ❌ UI | BAJA |
| **Auditoría** | Manual | ✅ Implementada | MEDIA |
| **Catalogos (Rangos/Baterías)** | N/A | ✅ Implementado | ALTA |

---

## 🎯 PLAN DE RECONSTRUCCIÓN (Orden de Implementación)

### **FASE 1: Consolidar Bases** (Crítica)
- [ ] Verificar endpoints `/api/personal` (CRUD completo)
- [ ] Verificar endpoints `/api/registros` (crear, listar, actualizar)
- [ ] Verificar endpoints `/api/rangos`, `/api/baterias`, `/api/items`
- [ ] Validar schema Prisma contra datos viejos

### **FASE 2: Fichas Individuales** (Alta)
- [ ] Crear endpoint `GET /api/ficha/:ci` que retorne:
  ```json
  {
    "personal": { ci, apellido1, apellido2, nombre1, nombre2, rango, bateria },
    "tallas": { PARKA: "M", CAMISACO: "M", ... },
    "registros": [
      { fecha, tipo, items: [{ nombre, cantidad }, ...] },
      ...
    ]
  }
  ```
- [ ] Crear componente React para renderizar ficha
- [ ] Implementar generación de PDF (usando `pdf-lib` o `jspdf`)
- [ ] Endpoint `GET /api/pdf-ficha/:ci`

### **FASE 3: Matriz De Entregas** (Media)
- [ ] Endpoint `GET /api/hoja-matrix` que retorne matriz:
  ```json
  {
    "personas": [
      { ci, rango, apellido1, apellido2, nombre1, tallas: {...} }
    ],
    "items": [{ id, nombre, ordenPdf }],
    "entregas": {
      "CI:ITEM_ID": cantidad,
      ...
    }
  }
  ```
- [ ] Componente matriz (tabla + colores)
- [ ] PDF de matriz

### **FASE 4: Mejoras UI** (Media/Baja)
- [ ] Observaciones: agregar UI para CRUD
- [ ] Herramienta para corregir CIs inválidas
- [ ] Búsqueda avanzada de personal
- [ ] Filtros por rango/bateria

### **FASE 5: Datos Legacy** (Media)
- [ ] Scripts para importar datos viejos desde CSV
- [ ] Validar integridad de datos migrados

---

## 📊 ESTRUCTURA DE DATOS RECOMENDADA

### **Personal**
```sql
ci: "45907815"
apellido1: "Perez"
apellido2: "Gomez"
nombre1: "Juan"
nombre2: "Carlos"
fechaIngreso: "2026-02-25"
rangoId: 3 (Cabo 1°)
bateriaId: 1
```

### **Personal_Talla**
```sql
ci: "45907815"
tallaTipoId: 1 (PARKA)
tallaValor: "M"
```

### **Registro** (Movimiento de items)
```sql
registroId: 1
ci: "45907815"
fecha: "2026-02-20"
tipo: "ENTREGA" | "DEVOLUCION" | "AJUSTE"
comentarios: "Entrega de uniforme inicial"
createdAt: timestamp
```

### **Registro_Item**
```sql
registroId: 1
itemId: 5 (Parka)
cantidad: 1
```

### **Observacion**
```sql
observacionId: 1
ci: "45907815"
fecha: "2026-02-20"
texto: "Soldado Pérez tiene lesión en hombro izquierdo"
createdAt: timestamp
```

---

## 🔌 ENDPOINTS A IMPLEMENTAR/MEJORAR

### Ya Existentes (Verificar)
```
GET    /api/personal
POST   /api/personal
PUT    /api/personal/:ci
DELETE /api/personal/:ci
GET    /api/rangos
GET    /api/baterias
GET    /api/items
GET    /api/registros
POST   /api/registros
```

### Nuevos Requeridos
```
GET    /api/ficha/:ci                  → Datos ficha + historial
GET    /api/pdf-ficha/:ci              → PDF ficha
GET    /api/hoja-matrix                → Matriz completa
GET    /api/pdf-matriz                 → PDF matriz
GET    /api/personal/:ci/registros     → Historial filtrado
GET    /api/observaciones/:ci          → Observaciones por persona
POST   /api/observaciones              → Crear observación
PUT    /api/observaciones/:observacionId
DELETE /api/observaciones/:observacionId
GET    /api/cedulasInvalidas           → Listar CIs inválidas
PUT    /api/personal/:ci/corregir-ci   → Actualizar CI
```

---

## 📦 DATOS VIEJOS DISPONIBLES

```
DATOS VIEJOS/
├── Datos Personales y Vestuario - Datos Personales.csv
│   └── Contiene registros históricos de personal
├── Datos Personales y Vestuario - Vestuario.csv
│   └── Contiene historial de entregas/devoluciones
└── hoja de entrega/
    └── Fichas individuales por persona (HTML)
```

**Datos a migrar:**
- ~100+ registros de personal
- ~500+ movimientos de vestuario (entregas/devoluciones)
- Información de tallas por persona

---

## 🛠️ PASOS TÉCNICOS

### 1. Validar Base Actual
```bash
npm install
npm run db:rebuild
npm run dev
curl http://localhost:3000/api/personal
```

### 2. Completar Endpoints Críticos
- Revisar `/src/app/api/personal/` → completar CRUD
- Revisar `/src/app/api/registros/` → completar CRUD

### 3. Agregar Fichas
- Nueva ruta: `/src/app/api/ficha/[ci].ts`
- Nuevo componente: `/src/app/components/FichaCard.tsx`
- Librería PDF: usar `pdf-lib` o `jspdf`

### 4. Agregar Matriz
- Nueva ruta: `/src/app/api/hoja-matrix.ts`
- Nuevo componente: `/src/app/components/MatrizView.tsx`

### 5. Importar Datos Legacy
- Script: `/scripts/import-personal-legacy.mjs`
- Script: `/scripts/import-registros-legacy.mjs`

---

## 💾 CONFIGURACIÓN REQUERIDA

```env
# .env.local
DATABASE_URL=postgresql://user:pass@neon.tech/db?schema=public
DATABASE_URL_UNPOOLED=postgresql://user:pass@neon.tech/db?schema=public
JWT_SECRET=tu-secreto-super-seguro
```

---

## ✅ CHECKLIST FINAL

### Análisis
- [x] Entender código viejo (Google Apps Script)
- [x] Identificar funcionalidades
- [x] Mapear a nuevas funcionalidades
- [x] Diseñar estructura de datos

### Implementación
- [ ] Completar endpoints de personal y registros
- [ ] Implementar fichas individuales
- [ ] Implementar matriz de entregas
- [ ] Importar datos viejos

### Testing
- [ ] Validar integridad de datos
- [ ] Pruebas de los nuevos endpoints
- [ ] Pruebas de generación de PDF
- [ ] Pruebas de importación de datos

### Deployment
- [ ] Documentar cambios
- [ ] Preparar scripts de migración
- [ ] Test en producción

---

## 📚 Referencias

- **Código Viejo:** `CODIGOVIEJO/` (Google Apps Script)
- **Datos Viejos:** `DATOS VIEJOS/` (CSV + HTML)
- **Nuevo Proyecto:** Estructura Next.js + Prisma
- **Documentación:** `GUIA_INICIO.md`, `README.md`

