#!/bin/bash

# 🧪 Script de Pruebas Completas para La Birrita
# ===============================================

echo "🍺 Testing La Birrita WhatsApp Automation System"
echo "================================================="

# Configuración
BASE_URL="http://localhost:3001"
AUTH_TOKEN="cleanup_contexts_secure_token_2024"
TEST_PHONE="549111234567"  # CAMBIAR POR TU NÚMERO DE PRUEBA

echo ""
echo "📋 INFORMACIÓN IMPORTANTE:"
echo "- Servidor corriendo en: $BASE_URL"
echo "- Número de prueba: $TEST_PHONE"
echo "- ANTES DE EJECUTAR: Configura .env.local con tus credenciales de WhatsApp"
echo ""

read -p "¿Has configurado las variables de entorno? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Configura primero las variables de entorno en .env.local"
    echo "Ver archivo: SETUP_COMPLETO_WHATSAPP.md"
    exit 1
fi

echo ""
echo "🔧 1. PROBANDO CONEXIÓN BÁSICA..."
echo "===================================="
curl -s "$BASE_URL/api/test/whatsapp?to=$TEST_PHONE&template=hello_world" | jq '.' || echo "❌ Error en conexión básica"

echo ""
echo "🎂 2. PROBANDO PLANTILLA DE CUMPLEAÑOS..."
echo "==========================================="
curl -s -X POST "$BASE_URL/api/test/whatsapp" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"templateName\": \"birthday_reminder\",
    \"parameters\": [\"Juan\", \"Juan\", \"La Birrita\", \"Oferta especial\", \"20\", \"100\"]
  }" | jq '.' || echo "❌ Error en plantilla de cumpleaños"

echo ""
echo "⭐ 3. PROBANDO PLANTILLA DE PUNTOS..."
echo "====================================="
curl -s -X POST "$BASE_URL/api/test/whatsapp" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"templateName\": \"points_notification\",
    \"parameters\": [\"María\", \"50\", \"200\", \"Cerveza gratis\", \"50\"]
  }" | jq '.' || echo "❌ Error en plantilla de puntos"

echo ""
echo "👑 4. PROBANDO PLANTILLA VIP..."
echo "==============================="
curl -s -X POST "$BASE_URL/api/test/whatsapp" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"templateName\": \"inactive_customer_vip\",
    \"parameters\": [\"Carlos\", \"8\", \"La Birrita\", \"Descuento VIP\", \"25\", \"150\"]
  }" | jq '.' || echo "❌ Error en plantilla VIP"

echo ""
echo "👋 5. PROBANDO PLANTILLA NUEVOS CLIENTES..."
echo "============================================"
curl -s -X POST "$BASE_URL/api/test/whatsapp" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"templateName\": \"inactive_customer_new\",
    \"parameters\": [\"Ana\", \"La Birrita\", \"2\", \"Promoción especial\", \"15\", \"100\"]
  }" | jq '.' || echo "❌ Error en plantilla nuevos clientes"

echo ""
echo "📝 6. PROBANDO PLANTILLA DATOS FALTANTES..."
echo "============================================"
curl -s -X POST "$BASE_URL/api/test/whatsapp" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TEST_PHONE\",
    \"templateName\": \"missing_data_request\",
    \"parameters\": [\"Luis\", \"La Birrita\", \"fecha de cumpleaños\", \"25\"]
  }" | jq '.' || echo "❌ Error en plantilla datos faltantes"

echo ""
echo "🤖 7. PROBANDO AUTOMATIZACIONES..."
echo "==================================="

echo ""
echo "7.1 Automatización de cumpleaños..."
curl -s -X POST "$BASE_URL/api/test/automations" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"birthday\",
    \"customerPhone\": \"$TEST_PHONE\"
  }" | jq '.' || echo "❌ Error en automatización cumpleaños"

echo ""
echo "7.2 Automatización de puntos..."
curl -s -X POST "$BASE_URL/api/test/automations" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"points\"
  }" | jq '.' || echo "❌ Error en automatización puntos"

echo ""
echo "7.3 Automatización clientes inactivos..."
curl -s -X POST "$BASE_URL/api/test/automations" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"inactive\"
  }" | jq '.' || echo "❌ Error en automatización inactivos"

echo ""
echo "7.4 Automatización campos faltantes..."
curl -s -X POST "$BASE_URL/api/test/automations" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"missing_fields\"
  }" | jq '.' || echo "❌ Error en automatización campos"

echo ""
echo "🎯 8. PROBANDO CRON JOBS..."
echo "==========================="

echo ""
echo "8.1 Cron cumpleaños..."
curl -s -X GET "$BASE_URL/api/cron/birthday-automations" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.' || echo "❌ Error en cron cumpleaños"

echo ""
echo "8.2 Cron puntos..."
curl -s -X GET "$BASE_URL/api/cron/points-notifications" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.' || echo "❌ Error en cron puntos"

echo ""
echo "8.3 Cron inactivos..."
curl -s -X GET "$BASE_URL/api/cron/inactive-customers" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.' || echo "❌ Error en cron inactivos"

echo ""
echo "8.4 Cron campos faltantes..."
curl -s -X GET "$BASE_URL/api/cron/missing-fields" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.' || echo "❌ Error en cron campos"

echo ""
echo "8.5 Todas las automatizaciones..."
curl -s -X GET "$BASE_URL/api/cron/run-automations" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.' || echo "❌ Error en cron general"

echo ""
echo "✅ PRUEBAS COMPLETADAS!"
echo "======================="
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Revisa los logs en la consola de Next.js"
echo "2. Verifica que las plantillas estén aprobadas en Meta"
echo "3. Activa las automatizaciones en /dashboard/loyalty"
echo "4. Configura las promociones asociadas"
echo "5. ¡Tu sistema está listo! 🚀"
echo ""
echo "📱 Revisa tu WhatsApp para ver los mensajes de prueba"
