#!/bin/bash

# Script para validar que Deposito_ART1 está correctamente configurado para Soldado Widget

set -e

DOMAIN="${1:-https://deposito-apt1.vercel.app}"
echo "Validando servidor: $DOMAIN"
echo ""

# Test 1: Health check de widget auth
echo "1. Verificando que autenticacion de widget está habilitada..."
HEALTH_RESPONSE=$(curl -sS "$DOMAIN/api/extensions/soldado-widget/health" || echo "{}")
if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
  echo "✓ OK: Widget auth habilitado"
else
  echo "✗ FALLO: Widget auth NO habilitado"
  echo "  Response: $HEALTH_RESPONSE"
  echo ""
  echo "Por favor configura SOLDADO_WIDGET_AUTH_SECRET en .env y redeploy"
  exit 1
fi
echo ""

# Test 2: Login con credenciales invalidas
echo "2. Probando endpoint de login con credenciales invalidas..."
LOGIN_RESPONSE=$(curl -sS -i -X POST "$DOMAIN/api/extensions/soldado-widget/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"invalid_user_xyz","password":"invalid_pass"}' 2>&1 | head -20)

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep '^HTTP' | awk '{print $2}' || echo "UNKNOWN")

if echo "$LOGIN_RESPONSE" | grep -q "307\|Redirect"; then
  echo "✗ FALLO: Servidor redirige (HTTP 307)"
  echo "  Root cause: El proxy aún está interceptando /api/extensions/soldado-widget"
  echo "  Solución: Verifica que src/proxy.ts exluya esa ruta y redeploy"
  echo ""
  echo "  Response: $LOGIN_RESPONSE"
  exit 1
elif echo "$LOGIN_RESPONSE" | grep -q "401\|Credenciales"; then
  echo "✓ OK: Endpoint responde 401 (credenciales invalidas esperadas)"
elif echo "$LOGIN_RESPONSE" | grep -q "200"; then
  echo "⚠ INESPERADO: 200 con credenciales invalidas (¿DB vacia?)"
else
  echo "✗ FALLO: Status HTTP $HTTP_STATUS (esperaba 401 o 400)"
  echo "  Response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

echo "✓ Validacion completada exitosamente"
echo ""
echo "Siguiente paso en la app Android:"
echo "  1. URL: $DOMAIN"
echo "  2. Usuario: [username de Deposito_ART1]"
echo "  3. Password: [password correcto]"
echo "  4. Guardar configuracion > Iniciar sesion > Sincronizar"
