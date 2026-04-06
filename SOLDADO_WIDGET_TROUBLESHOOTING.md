# Guía de Troubleshooting: Soldado Widget Login

## El problema

La app Android muestra errores de login/sincronización. Los errores ahora son más específicos:

- **"Error del servidor (HTTP 307, posible redireccion/HTML)"** → El proxy web está interceptando el endpoint
- **"HTTP 401"** → Credenciales inválidas (usuario o password incorrecto)
- **"Respuesta invalida del servidor. JSON incompleto"** → El servidor responde JSON pero no tiene los campos esperados

## Checklist de solución paso a paso

### 1. Servidor (Deposito_ART1)

```bash
cd Deposito_ART1
```

**a) Verificar variables de entorno en .env:**

```env
SOLDADO_WIDGET_AUTH_SECRET="0Z9BONqnIWmpQQWrlg7MvE6yiNwdiFhqyPLi11BOsavtSWJ1kjjXg+N7yiN7WAuGQ=="
SOLDADO_WIDGET_TOKEN_TTL_HOURS="0"
```

Si no están, **agrégalas** y guarda.

**b) Validar el proxy está excluido el endpoint del widget:**

```bash
grep "api/extensions/soldado-widget" src/proxy.ts
```

Debe devolver una línea con esa ruta en la lista de exclusiones.

Si NO aparece, ejecuta:

```bash
# Ver el estado actual
git diff src/proxy.ts
# Si ves cambios, estás en la rama correcta; redeploy
```

**c) Redeploy con los cambios:**

Si usas Vercel:
```bash
git add .env src/proxy.ts
git commit -m "feat: habilitar soldado widget auth y excluir proxy"
git push
# Espera el deploy automático
```

Si es local con `npm run dev`:
```bash
npm run dev
```

**d) Validar que el servidor responde correctamente:**

```bash
# Ejecutar script de validación
bash scripts/validate-widget-config.sh https://tu-dominio-aca
```

Resultado esperado:
```
✓ OK: Widget auth habilitado
✓ OK: Endpoint responde 401 (credenciales invalidas esperadas)
✓ Validacion completada exitosamente
```

### 2. Credenciales (Base de datos)

Asegúrate de que el usuario existe y está activo:

```bash
npm run prisma:studio
# O si no tienes Prisma Studio:
# Navega a https://tu-dominio/api/db-status para confirmar DB está OK
```

Busca un usuario de prueba o crea uno:

```bash
npm run user:create -- --username "soldado_test" --password "Test1234" --role ADMIN
```

### 3. App Android

**a) En ConfigActivity, llena:**

- URL base: `https://deposito-apt1.vercel.app` (o tu dominio)
- Usuario: El que creaste arriba (ej: `soldado_test`)
- Password: La password que pusiste (ej: `Test1234`)

**b) Toca "Guardar configuracion"**
- Estado esperado: "Configuracion guardada. Ahora inicia sesion."

**c) Toca "Iniciar sesion"**
- Estado esperado: "Sesion iniciada para [usuario]."
- Si falla, leerá el error específico HTTP (307, 401, etc.)

**d) Toca "Sincronizar recordatorios"**
- Estado esperado: "Sincronizacion OK: X pendientes, Y urgentes."

## Errores comunes y soluciones

### Error: "HTTP 307 - Redireccion"

**Causa:** El proxy aún intercepta /api/extensions/soldado-widget

**Solución:**
1. Verifica que `src/proxy.ts` tiene `api/extensions/soldado-widget` en exclusiones
2. Si no está, agrégalo manualmente:
   ```typescript
   matcher: [
     "/((?!api/auth|api/extensions/soldado-widget|auth/...|_next/...|...)*)",
   ],
   ```
3. Redeploy

### Error: "HTTP 401 - Credenciales invalidas"

**Solución:**
1. Verifica usuario y password en la base de datos
2. Crea un usuario de prueba: `npm run user:create -- --username test --password Test1234 --role ADMIN`
3. Intenta login con ese usuario

### Error: "Respuesta invalida del servidor"

**Causa:** El servidor responde JSON pero sin los campos `accessToken`, `expiresAt`, o `usuario.usuarioId`

**Solución:**
1. Verifica que endpoint `/api/extensions/soldado-widget/login` existe
2. Prueba manualmente:
   ```bash
   curl -X POST https://tu-dominio/api/extensions/soldado-widget/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"test","password":"Test1234"}'
   ```
   Debe responder con `accessToken`, `expiresAt`, `usuario`, etc.

## Prueba rápida sin Android

Para validar antes de usar la app:

```bash
# 1. Crear usuario
npm run user:create -- --username widget_test --password Test1234 --role ADMIN

# 2. Validar health
bash scripts/validate-widget-config.sh https://tu-dominio

# 3. Login manual
curl -X POST https://tu-dominio/api/extensions/soldado-widget/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"widget_test","password":"Test1234"}'

# Respuesta esperada:
# {
#   "accessToken": "v1.eyJ...",
#   "expiresAt": "2100-01-01T00:00:00.000Z",
#   "usuario": {
#     "usuarioId": "...",
#     "username": "widget_test"
#   }
# }

# 4. Con el token de arriba, sincronizar recordatorios
curl https://tu-dominio/api/extensions/soldado-widget/recordatorios?limit=3 \
  -H 'Authorization: Bearer v1.eyJ...'

# Respuesta esperada: JSON con pending/urgent count
```

## Si sigue fallando después de todo lo anterior

Pasame:
1. Output de `bash scripts/validate-widget-config.sh https://tu-dominio`
2. Resultado del curl manual de login
3. El error exacto que muestra la app Android (en ConfigActivity, el status text)
