# Setup Rápido - Vitest

Esta guía te ayuda a configurar y ejecutar los tests rápidamente.

## 1. Instalar Dependencias

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @vitejs/plugin-react
```

## 2. Verificar Configuración

El archivo `vitest.config.ts` ya está creado en la raíz del proyecto.

## 3. Ejecutar Tests

```bash
# Modo watch (recomendado para desarrollo)
npm run test

# UI interactiva con gráficos
npm run test:ui

# Reporte de cobertura
npm run test:coverage

# Un solo run
npm run test -- --run
```

## 4. Ver Resultados

Deberías ver algo como:

```
✓ src/lib/handlers.test/handlers-catalog.test.ts (3)
✓ src/lib/handlers.test/handlers-personal.test.ts (6)
✓ src/lib/handlers.test/handlers-registros.test.ts (8)
✓ src/lib/handlers.test/handlers-usuarios.test.ts (8)

Test Files  4 passed (4)
Tests  25 passed (25)
```

## 5. Ubicación de Tests

```
src/lib/handlers.test/
├── handlers-catalog.test.ts      (Rango, Bateria, Item)
├── handlers-personal.test.ts     (Personal CRUD)
├── handlers-registros.test.ts    (Registros/movimientos)
├── handlers-usuarios.test.ts     (Usuarios, Auth, FirmaConfig)
└── README.md                      (Documentación)
```

## Notas Importantes

1. **Los tests mockean la API** - No hacen llamadas HTTP reales
2. **Ejecuta los tests en paralelo** - Vitest lo hace automáticamente
3. **Los tests son independientes** - No dependen unos de otros

## Troubleshooting

### Error: "Cannot find module '@vitejs/plugin-react'"
```bash
npm install -D @vitejs/plugin-react
```

### Error: "Module 'vitest' not found"
```bash
npm install -D vitest
```

### Los tests no se ejecutan
```bash
# Limpiar caché y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run test
```

## Próximos Pasos

1. Ejecutar `npm run test` para ver todos los tests pasar
2. Ver `npm run test:coverage` para cobertura actual
3. Leer [src/lib/handlers.test/README.md](src/lib/handlers.test/README.md) para patrones de testing
