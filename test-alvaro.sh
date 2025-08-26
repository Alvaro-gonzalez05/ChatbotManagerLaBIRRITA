#!/bin/bash

# 🧪 Pruebas específicas para Álvaro - La Birrita
# ==============================================

echo "🍺 Probando plantillas de WhatsApp para Álvaro"
echo "=============================================="

# Configuración
BASE_URL="http://localhost:3001"
TEST_PHONE="2616977056"  # Número de Álvaro
AUTH_TOKEN="cleanup_contexts_secure_token_2024"

echo ""
echo "📱 Número de prueba: $TEST_PHONE"
echo "🌐 Servidor: $BASE_URL"
echo ""

# Verificar que el servidor esté corriendo
echo "🔍 Verificando servidor..."
if ! curl -s "$BASE_URL/api/health" >/dev/null 2>&1; then
    echo "❌ Servidor no disponible. Asegúrate de que esté corriendo en puerto 3001"
    echo "💡 Ejecuta: npm run dev"
    exit 1
fi

echo "✅ Servidor disponible"
echo ""

# Función para enviar plantilla
send_template() {
    local template_name=$1
    local description=$2
    
    echo "📤 Probando: $description"
    echo "   Plantilla: $template_name"
    
    response=$(curl -s -X POST "$BASE_URL/api/test/alvaro" \
        -H "Content-Type: application/json" \
        -d "{\"testPhone\": \"$TEST_PHONE\", \"templateName\": \"$template_name\"}")
    
    # Extraer estado del JSON
    success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
    error_msg=$(echo "$response" | jq -r '.error // ""' 2>/dev/null)
    
    if [ "$success" = "true" ]; then
        echo "   ✅ ENVIADO - Revisa tu WhatsApp"
    else
        echo "   ❌ ERROR: $error_msg"
        echo "   📋 Respuesta completa:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
    echo ""
    
    # Pausa entre envíos para no saturar la API
    sleep 2
}

echo "🚀 Iniciando pruebas de plantillas..."
echo ""

# 1. Plantilla básica de Meta
send_template "hello_world" "Plantilla básica de Meta (hello_world)"

# 2. Cumpleaños
send_template "birthday_reminder" "🎂 Recordatorio de cumpleaños"

# 3. Puntos
send_template "points_notification" "⭐ Notificación de puntos"

# 4. Cliente VIP inactivo
send_template "inactive_customer_vip" "👑 Cliente VIP inactivo"

# 5. Cliente nuevo inactivo
send_template "inactive_customer_new" "👋 Cliente nuevo inactivo"

# 6. Datos faltantes
send_template "missing_data_request" "📝 Solicitud de datos faltantes"

echo "🎯 Todas las pruebas completadas!"
echo ""
echo "📱 REVISA TU WHATSAPP (+54 $TEST_PHONE)"
echo "Deberías haber recibido 6 mensajes diferentes"
echo ""
echo "📋 Si algún mensaje no llegó:"
echo "1. Verifica que las plantillas estén APROBADAS en Meta Business Manager"
echo "2. Revisa las variables WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID"
echo "3. Confirma que tu número esté agregado como tester en Meta"
echo ""
echo "✅ ¡Listo para producción! 🚀"
