#!/bin/bash

# Script de prueba para EVENT-DRIVEN automatizaciones
# Ejecutar desde la carpeta frontend

echo "🚀 Probando sistema EVENT-DRIVEN de automatizaciones..."
echo "======================================================="

# URL base (cambiar en producción)
BASE_URL="http://localhost:3000"
# BASE_URL="https://tu-dominio.vercel.app"

# Business ID que queremos probar
BUSINESS_ID="f2a24619-5016-490c-9dc9-dd08fd6549b3"

echo ""
echo "=== COMPARACIÓN: LEGACY vs EVENT-DRIVEN ==="

echo ""
echo "1. 📜 Probando sistema LEGACY (viejo)..."
echo "⚠️  Esto hace queries masivas y es lento"
curl -X GET "$BASE_URL/api/automations?business_id=$BUSINESS_ID&mode=legacy" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "2. 🚀 Probando sistema EVENT-DRIVEN (nuevo)..."
echo "✅ Esto es optimizado y rápido"
curl -X GET "$BASE_URL/api/automations?business_id=$BUSINESS_ID&mode=event-driven" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=== EVENTOS ESPECÍFICOS ==="

echo ""
echo "3. 🎂 Evento de cumpleaños (optimizado)..."
curl -X GET "$BASE_URL/api/automation-events?event=birthdays" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "4. 💤 Evento de clientes inactivos..."
curl -X GET "$BASE_URL/api/automation-events?event=inactive&business_id=$BUSINESS_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "5. 🧪 Simular registro de cliente (trigger automático)..."
curl -X GET "$BASE_URL/api/automation-events?event=test-customer&business_id=$BUSINESS_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "6. 🔥 Probar notificación AUTOMÁTICA de puntos..."
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
echo "7. 📝 Simular registro de cliente en tiempo real..."
curl -X POST "$BASE_URL/api/customers" \
  -H "Content-Type: application/json" \
  -d "{
    \"business_id\": \"$BUSINESS_ID\",
    \"name\": \"Cliente Prueba Event-Driven\",
    \"phone\": \"549123456789\",
    \"email\": null,
    \"instagram_username\": null,
    \"birthday\": null,
    \"points\": 0
  }" \
  | jq '.'

echo ""
echo "✅ Pruebas EVENT-DRIVEN completadas!"
echo ""
echo "🎯 BENEFICIOS DEL SISTEMA EVENT-DRIVEN:"
echo "  ✅ Sin queries masivas (más rápido)"
echo "  ✅ Escalable a millones de clientes"  
echo "  ✅ Procesamiento en tiempo real"
echo "  ✅ Eventos específicos optimizados"
echo "  ✅ Puntos automáticos instantáneos"
echo "  ✅ Registro de clientes con triggers automáticos"
echo ""
echo "🔥 EVENTOS DISPONIBLES:"
echo "  - 🎂 /api/automation-events?event=birthdays"
echo "  - 💤 /api/automation-events?event=inactive&business_id=UUID"
echo "  - 🧪 /api/automation-events?event=test-customer"
echo "  - ⭐ /api/points/load (automático)"
echo "  - 📝 /api/customers POST (trigger automático)"
echo ""
echo "🚀 Para usar en producción:"
echo "  - Cambia cron jobs a: /api/automations?mode=event-driven"
echo "  - O mejor: /api/automation-events?event=birthdays (diario)"
echo "  - Resto es automático al cargar puntos o registrar clientes"