#!/bin/bash

# Script de prueba para todas las automatizaciones
# Ejecutar desde la carpeta frontend

echo "🤖 Probando todas las automatizaciones..."
echo "============================================"

# URL base (cambiar en producción)
BASE_URL="http://localhost:3000"
# BASE_URL="https://tu-dominio.vercel.app"

# Business ID que queremos probar
BUSINESS_ID="f2a24619-5016-490c-9dc9-dd08fd6549b3"

echo ""
echo "1. 🤖 Probando TODAS las automatizaciones..."
curl -X GET "$BASE_URL/api/automations" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "2. 🏢 Probando automatizaciones para business específico: $BUSINESS_ID"
curl -X GET "$BASE_URL/api/automations?business_id=$BUSINESS_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "3. 🧪 Probando automatización de cumpleaños para un teléfono específico..."
echo "Ingresa el número de teléfono para probar (formato: 54911234567):"
read TEST_PHONE

if [ ! -z "$TEST_PHONE" ]; then
  echo "🎂 Probando cumpleaños para: $TEST_PHONE"
  curl -X GET "$BASE_URL/api/automations?test_phone=$TEST_PHONE&test_type=birthday" \
    -H "Content-Type: application/json" \
    | jq '.'
fi

echo ""
echo "4. 🔥 Probando notificación AUTOMÁTICA de puntos..."
echo "Ingresa el customer_id para probar carga de puntos (o Enter para omitir):"
read CUSTOMER_ID

if [ ! -z "$CUSTOMER_ID" ]; then
  echo "Ingresa el teléfono del cliente:"
  read CUSTOMER_PHONE
  
  if [ ! -z "$CUSTOMER_PHONE" ]; then
    echo "⭐ Cargando puntos (esto enviará notificación AUTOMÁTICAMENTE)..."
    curl -X POST "$BASE_URL/api/points/load" \
      -H "Content-Type: application/json" \
      -d "{
        \"customer_id\": \"$CUSTOMER_ID\",
        \"business_id\": \"$BUSINESS_ID\",
        \"customer_phone\": \"$CUSTOMER_PHONE\",
        \"amount_spent\": 1000,
        \"points_awarded\": 50,
        \"loaded_by\": \"test-user\"
      }" \
      | jq '.'
  fi
fi

echo ""
echo "5. 📊 Probando automatizaciones programadas (sin puntos - ahora es automático)..."
curl -X GET "$BASE_URL/api/automations?business_id=$BUSINESS_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "✅ Pruebas completadas!"
echo "Revisa los logs en la consola de Next.js para ver los detalles."
echo ""
echo "📝 Templates configurados:"
echo "  - 🔥 points_notification: {{1}}=Nombre, {{2}}=Puntos sumados, {{3}}=Recompensas (AUTOMÁTICO)"
echo "  - birthday_reminder: HEADER={{1}}=Nombre, BODY={{1}}=Promoción, {{2}}=Puntos regalo"
echo "  - inactive_customer_vip: HEADER={{1}}=Nombre, BODY={{1}}=Promoción especial"
echo "  - missing_data_request: {{1}}=Nombre, {{2}}=Campo faltante, {{3}}=Puntos recompensa"
echo ""
echo "🎯 IMPORTANTE: Las notificaciones de puntos ahora se envían AUTOMÁTICAMENTE"
echo "   al cargar puntos usando /api/points/load - No necesita cron job!"
