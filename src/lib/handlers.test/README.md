# Tests para Handlers

Este directorio contiene tests unitarios para los handler functions de la aplicación Soldados APP.

## Estructura

```
handlers.test/
├── handlers-catalog.test.ts      # Tests para Rango, Bateria, Item
├── handlers-personal.test.ts     # Tests para Personal CRUD
├── handlers-registros.test.ts    # Tests para Registros/movimientos
├── handlers-usuarios.test.ts     # Tests para Usuarios y Auth
└── README.md                      # Este archivo
```

## Setup para Ejecutar Tests

### 1. Instalar Vitest (recomendado)

```bash
npm install -D vitest @vitest/ui
```

### 2. Configurar vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 3. Actualizar package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Ejecutar Tests

```bash
# Modo watch (recomendado para desarrollo)
npm run test

# UI interactiva
npm run test:ui

# Cobertura de código
npm run test:coverage

# Un solo run
npm run test -- --run
```

## Patrones de Testing

### 1. Mock de API

```typescript
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));
```

### 2. Setup y Cleanup

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 3. Testing de Callbacks

```typescript
it("debería llamar a onSuccess cuando es exitoso", async () => {
  const onSuccess = vi.fn();
  
  await createRangoHandler(data, { onSuccess });
  
  expect(onSuccess).toHaveBeenCalled();
});
```

### 4. Testing de Manejo de Errores

```typescript
it("debería manejar errores correctamente", async () => {
  const onError = vi.fn();
  vi.mocked(api.api).mockRejectedValue(new Error("Error"));
  
  try {
    await createRangoHandler(data, { onError });
  } catch {
    // Error esperado
  }
  
  expect(onError).toHaveBeenCalledWith("Error");
});
```

### 5. Testing de Llamadas API

```typescript
it("debería hacer llamada POST correcta", async () => {
  vi.mocked(api.api).mockResolvedValue({});
  
  await createRangoHandler(data, {});
  
  expect(vi.mocked(api.api)).toHaveBeenCalledWith(
    "/api/rangos",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
  );
});
```

## Cobertura Objetivo

- **Functions**: 80%+ coverage
- **Branches**: 75%+ coverage (todos los handlers + error paths)
- **Lines**: 85%+ coverage

## Próximos Steps

1. **Ampliar tests** para handlers-auth.ts
2. **Agregar tests de integración** para flujos complejos
3. **Tests de UI** para hooks (useCallback, useEffect)
4. **E2E tests** para flujos críticos de usuario

## Debugging Tests

### Ver salida detallada

```bash
npm run test -- --reporter=verbose
```

### Debuggear test específico

```bash
npm run test -- handlers-catalog.test.ts
```

### Debuggear con breakpoints

```bash
node --inspect-brk node_modules/vitest/vitest.mjs
```

## Notas Importantes

- Los tests mockean la API, no hacen llamadas reales
- Se enfoucan en validación de inputs/outputs del handler
- Se prueban manejo de errores y callbacks
- Se valida que las llamadas API sean correctas

## Ejemplos de Datos de Prueba

```typescript
// Personal
const mockPersonalPayload = {
  ci: "1234567890",
  apellido1: "Pérez",
  nombre1: "Juan",
  rangoId: "1",
  bateriaId: "1",
};

// Registro
const mockRegistroPayload = {
  ci: "1234567890",
  tipo: "ENTREGA",
  fecha: "2024-02-26",
  items: [{ itemId: "ITEM1", cantidad: 1 }],
};
```

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Mocking](https://vitest.dev/guide/mocking.html)
- [Testing Best Practices](https://vitest.dev/guide/testing-patterns.html)
