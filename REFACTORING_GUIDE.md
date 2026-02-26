# Estructura Modular - Guía de Refactorización

## 📁 Estructura de Directorios

```
src/app/
├── page.tsx                          # Componente principal (será reducido)
├── types/
│   └── index.ts                      # Tipos compartidos
├── lib/
│   ├── utils.ts                      # Funciones de utilidad (nuevo)
│   ├── api.ts                        # Funciones de API (si es necesario)
│   └── ... (archivos existentes)
├── components/
│   ├── shared/
│   │   └── index.ts                  # Componentes reutilizables
│   └── views/
│       ├── TallasResumenView.tsx      # ✅ COMPLETADO
│       ├── PersonalView.tsx           # TODO
│       ├── HojaMatrixView.tsx         # TODO
│       └── ConfigViews.tsx            # TODO (Grados, Baterías, Items, Admin)
└── (resto de archivos)
```

## 🎯 Estado Actual

### ✅ Completado
- **types/index.ts** - Todos los tipos centralizados
- **lib/utils.ts** - Funciones compartidas y constantes
- **components/shared/index.ts** - Componentes reutilizables
- **components/views/TallasResumenView.tsx** - Vista de tallas resumidas modularizada

### 📝 Próximos Pasos

#### 1. **PersonalView.tsx** (~1000 líneas)
Debe incluir:
- Tabla de personal con búsqueda y paginación
- Formulario para crear/editar personal
- Diálogo de selección de personal
- Gestión de registros (entregas/devoluciones)

**Props:**
```tsx
interface PersonalViewProps {
  personal: Personal[];
  rangos: Rango[];
  baterias: Bateria[];
  items: Item[];
  isAdmin: boolean;
  onPersonalUpdate: () => Promise<void>;
}
```

#### 2. **HojaMatrixView.tsx** (~300 líneas)
Debe incluir:
- Tabla de matriz con diseño responsive
- Exportación a PDF
- Descarga de datos

**Props:**
```tsx
interface HojaMatrixViewProps {
  personal: Personal[];
  items: Item[];
  baterias: Bateria[];
  rangos: Rango[];
}
```

#### 3. **ConfigViews.tsx** (~1500 líneas)
Dividir en sub-componentes:
- GradosConfigView
- BateriasConfigView
- ItemsConfigView
- AdminUsersView

**Props:**
```tsx
interface ConfigViewsProps {
  activeConfig: "grados" | "baterias" | "items" | "admin";
  rangos: Rango[];
  baterias: Bateria[];
  items: Item[];
  usuarios: UsuarioAdmin[];
  auditoria: AuditoriaRecord[];
  isAdmin: boolean;
  onDataUpdate: () => Promise<void>;
}
```

## 🔧 Cómo Crear un Nuevo Componente de Vista

### Plantilla Base

```tsx
"use client";

import type { ComponentProps } from "react";
import type { 
  Personal, 
  Bateria, 
  // otros tipos necesarios
} from "../types";

export interface [NombreView]Props {
  personal: Personal[];
  baterias: Bateria[];
  // otras props necesarias
}

export function [NombreView]({
  personal,
  baterias,
}: [NombreView]Props) {
  // Lógica aquí

  return (
    <section className="mt-6 space-y-4">
      {/* Contenido aquí */}
    </section>
  );
}
```

### Pasos para Extraer una Vista

1. **Copiar código** de page.tsx relacionado a esa vista
2. **Extraer props** que necesita el componente
3. **Eliminar estado compartido** que no necesita (usar props en su lugar)
4. **Importar tipos** de `../types`
5. **Importar utilidades** de `../lib/utils.ts`
6. **Actualizar page.tsx** para usar el nuevo componente

### Ejemplo: De page.tsx a Componente

**Antes (en page.tsx)**
```tsx
{activeView === "personal" ? (
  <section>
    {/* 500 líneas de código */}
  </section>
) : null}
```

**Después (step 1: crear PersonalView.tsx)**
```tsx
// components/views/PersonalView.tsx
export function PersonalView({ personal, ...props }) {
  return (
    <section>
      {/* 500 líneas de código */}
    </section>
  );
}
```

**Después (step 2: usar en page.tsx)**
```tsx
import { PersonalView } from "./components/views/PersonalView";

// En el return de page.tsx:
{activeView === "personal" ? (
  <PersonalView personal={personal} {...otherProps} />
) : null}
```

## 📊 Impacto de la Refactorización

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Líneas en page.tsx | 3700+ | ~500 | -86% |
| Componentes reutilizables | 0 | 8+ | Nuevos |
| Tipos centralizados | No | Sí | Mejor mantenimiento |
| Facilidad de testeo | Baja | Alta | Componentes aislados |

## 🛠️ Herramientas Disponibles

### Funciones Útiles (en lib/utils.ts)
- `tallasMap()` - Convierte tallas a objeto
- `apellidosLabel()` - Formatea apellidos
- `nombresLabel()` - Formatea nombres
- `normalizeSearchTerm()` - Normaliza búsquedas
- `personalPayload()` - Prepara datos para API
- `toEditablePersonal()` - Convierte Personal a PersonalForm
- `api()` - Realiza llamadas a API

### Componentes Compartidos (en components/shared/index.ts)
- `CatalogCard` - Tarjeta para crear elementos
- `SmallActionButton` - Botones de acción compactos
- `PaginationControls` - Controles de paginación

## 💡 Mejores Prácticas

1. **Mantener componentes pequeños** (<300 líneas)
2. **Props sobre estado global** cuando sea posible
3. **Extraer lógica en hooks** para reutilizar
4. **Usar tipos compartidos** de types/index.ts
5. **Documentar props** con JSDoc
6. **Reutilizar componentes compartidos**

## 📋 Checklist para la Próxima Sesión

- [ ] Crear PersonalView.tsx
- [ ] Crear HojaMatrixView.tsx
- [ ] Crear ConfigViews.tsx con sub-componentes
- [ ] Actualizar imports en page.tsx
- [ ] Eliminar código duplicado de page.tsx
- [ ] Reducir page.tsx a componente orquestador
- [ ] Probar que todo funciona correctamente
