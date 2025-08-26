#!/bin/bash

# Script de prueba para todas las automatizaciones
# Ejecutar desde la carpeta frontend

echo "🤖 Probando todas las automatizaciones..."
echo "============================================"

# URL base (cambiar en producción)
BASE_URL="http://localhost:3000"
# BASE_URL="https://tu-dominio.vercel.app"

# Token de autorización
AUTH_TOKEN="cleanup_contexts_secure_token_2024"

echo ""
echo "1. 🎂 Probando automatizaciones de cumpleaños..."
curl -X GET "$BASE_URL/api/cron/birthday-automations" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "2. ⭐ Probando notificaciones de puntos..."
curl -X GET "$BASE_URL/api/cron/points-notifications" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "3. 💤 Probando clientes inactivos..."
curl -X GET "$BASE_URL/api/cron/inactive-customers" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "4. 📝 Probando campos faltantes..."
curl -X GET "$BASE_URL/api/cron/missing-fields" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "5. 🤖 Probando todas las automatizaciones juntas..."
curl -X GET "$BASE_URL/api/cron/run-automations" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "✅ Pruebas completadas!"
echo "Revisa los logs en la consola de Next.js para ver los detalles."
