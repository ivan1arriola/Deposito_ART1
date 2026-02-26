# Guía de Inicio - Soldados APP

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn
- PostgreSQL (normalmente en Neon)

### Instalación

```bash
# Clonar o descargar el repositorio
cd Soldados_APP

# Instalar dependencias
npm install

# Configurar variables de entorno
# Editar .env.local con tus credenciales de base de datos
cp .env .env.local

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones si es necesario
npx prisma migrate dev

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor en modo desarrollo

# Producción
npm run build            # Compila para producción
npm run start            # Inicia servidor estático

# Utilidades
npm run lint             # Ejecuta ESLint
npx prisma studio       # GUI para Prisma (admin de base de datos)
npx prisma migrate dev  # Aplica migraciones pendientes
```

## 📁 Estructura del Proyecto

```
src/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Componente principal (SPA)
│   ├── api/                      # Rutas API
│   ├── components/
│   │   ├── views/                # Vistas grandes
│   │   ├── shared/               # Componentes reutilizables
│   ├── hooks/                    # Custom hooks refactorizados
│   └── lib/                      # Utilidades (utils)
├── lib/                          # Librerías compartidas
│   ├── handlers-*.ts             # Handlers de operaciones CRUD
│   ├── audit-helpers.ts          # Utilidades de auditoría
│   └── [otras utilidades]
├── types/                        # TypeScript types organizados
│   ├── entities.ts               # Domain entities
│   ├── forms.ts                  # Form types
│   └── views.ts                  # UI state types
└── prisma/                       # Configuración Prisma
    └── schema.prisma             # Esquema de BD

public/                           # Archivos estáticos
scripts/                          # Scripts de utilidad (imports, etc.)
```

## 🔌 API Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Usuario actual

### Catálogos
- `GET/POST /api/rangos` - Grados del personal
- `GET/POST /api/baterias` - Baterías
- `GET/POST /api/items` - Items/Prendas

### Personal
- `GET/POST /api/personal` - CRUD personal
- `GET /api/personal/[ci]` - Personal por CI

### Registros
- `GET/POST /api/registros` - Movimientos de items
- `PUT /api/registros/[id]` - Actualizar movimiento

### Otros
- `GET /api/hoja-matrix` - Matriz de entregas
- `GET /api/firma-config` - Configuración de firmas
- `GET /api/auditoria` - Log de auditoría

## 🔐 Roles de Usuario

- **ADMIN**: Acceso completo (crear usuarios, configurar firmas, etc.)
- **EDITOR**: Crear/editar personal y registros
- **VIEWER**: Solo lectura de datos

## 📊 Base de Datos

La aplicación usa PostgreSQL con Prisma ORM.

**Entidades principales:**
- `Usuario` - Users del sistema
- `Personal` - Personal de la unidad
- `Rango` - Grados militares
- `Bateria` - Agrupaciones
- `Item` - Equipamiento
- `Registro` - Movimientos (entrega/devolución)
- `Auditoria` - Log de acciones
- `FirmaConfig` - Configuración de firmas

## 🎨 Diseño y Estilos

- **CSS Framework**: Tailwind CSS 4
- **Componentes**: Custom con React
- **Temas**: Colores militares "ej-" prefixed
- **Print**: Optimizado para impresión PDF

## 🧪 Testing (Planeado)

```bash
# Próximamente
npm run test             # Ejecuta tests
npm run test:watch      # Tests en modo watch
npm run test:coverage   # Cobertura de tests
```

## 🐛 Troubleshooting

### Error de compilación TypeScript
```bash
# Limpiar y reinstalar
rm -rf .next node_modules
npm install
npm run build
```

### Error de Prisma
```bash
# Regenerar cliente
npx prisma generate

# Si persiste, resetear BD
npx prisma migrate reset
```

### Puerto 3000 en uso
```bash
# Usar diferente puerto
PORT=3001 npm run dev
```

## 📚 Documentación Adicional

- Ver `REFACTORING_SUMMARY.md` para detalles técnicos
- Ver código en `src/lib/handlers-*.ts` para ejemplos de handlers
- Ver `src/types/` para definiciones de tipos

## 💡 Tips de Desarrollo

1. **Hot Reload**: Los cambios se reflejan automáticamente
2. **Debugging**: Usa `console.log()` y DevTools del navegador
3. **Base de Datos**: Usa `npx prisma studio` para gestionar datos
4. **TypeScript**: El compilador atrapa errores en tiempo de desarrollo

## 📝 Requisitos de Deployment

- Node.js 18+ en el servidor
- PostgreSQL accesible
- Variables de entorno configuradas (.env)
- npm install ejecutado

### Comandos para Producción

```bash
# Build
npm run build

# Aplicar migraciones si es necesario
npx prisma migrate deploy

# Iniciar servidor
npm start
```

---

**Soporte**: Revisar logs en consola y .env para troubleshooting
**Última actualización**: Diciembre 2024
