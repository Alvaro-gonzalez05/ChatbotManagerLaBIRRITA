# 🤖 Configuración Completa: Promociones + Chat con IA

## 🎯 PARTE 1: PROMOCIONES DINÁMICAS

### ✅ **YA IMPLEMENTADO:**
- Las automatizaciones ahora obtienen la promoción real de la base de datos
- Se construye el texto de promoción dinámicamente
- Incluye descuentos, puntos y descripción de la promoción

### 📝 **Para usar promociones:**

1. **Ve al Dashboard:**
   ```
   http://localhost:3001/dashboard/loyalty
   ```

2. **Crea Promociones:**
   - Ve a la sección "Promociones"
   - Crea promociones con:
     - Título atractivo
     - Descripción
     - Porcentaje de descuento
     - Puntos de recompensa

3. **Asigna Promociones a Automatizaciones:**
   - En cada automatización, selecciona la promoción
   - Guarda los cambios

## 📱 PARTE 2: CONFIGURAR CHAT CON IA

### 🔧 **Paso 1: Configurar Webhook en Meta Business Manager**

1. **Ve a Meta for Developers:**
   ```
   https://developers.facebook.com
   ```

2. **Ve a tu App → WhatsApp → Configuration**

3. **Configurar Webhook:**
   ```
   Callback URL: https://tu-dominio.vercel.app/api/webhook/whatsapp
   Verify Token: LaBirrita_webhook_2024
   ```

4. **Suscribirse a Eventos:**
   ✅ `messages`
   ✅ `message_deliveries`  
   ✅ `message_reads`

### 🌐 **Paso 2: Obtener URL Pública (para testing)**

#### Opción A: ngrok (Para Testing Local)
```bash
# Instalar ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Autenticar ngrok (registrarse gratis en ngrok.com)
ngrok config add-authtoken TU_AUTHTOKEN

# Exponer puerto 3001
ngrok http 3001
```

#### Opción B: Deploy en Vercel (Para Producción)
```bash
# En tu directorio frontend
vercel --prod
```

### 🔧 **Paso 3: Verificar Variables de Entorno**

En `.env.local` asegúrate de tener:
```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=tu_token
WHATSAPP_PHONE_NUMBER_ID=793528520499781
WHATSAPP_VERIFY_TOKEN=LaBirrita_webhook_2024

# Para ngrok (si usas)
NEXT_PUBLIC_BASE_URL=https://tu-url-ngrok.ngrok-free.app

# Para Vercel (si usas)
NEXT_PUBLIC_BASE_URL=https://tu-app.vercel.app
```

### 🧪 **Paso 4: Probar el Webhook**

1. **Verificar que el servidor esté corriendo:**
   ```bash
   curl http://localhost:3001/api/webhook/whatsapp
   ```

2. **Probar verificación de webhook:**
   ```bash
   curl "http://localhost:3001/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=LaBirrita_webhook_2024&hub.challenge=test"
   ```

### 📱 **Paso 5: Configurar en Meta Business Manager**

1. **Webhook URL:**
   - Local: `https://tu-ngrok-url.ngrok-free.app/api/webhook/whatsapp`
   - Producción: `https://tu-dominio.vercel.app/api/webhook/whatsapp`

2. **Verify Token:** `LaBirrita_webhook_2024`

3. **Verificar:** Hacer clic en "Verify and Save"

### 🤖 **Paso 6: Probar el Chat con IA**

1. **Desde tu WhatsApp (+54 2616977056):**
   ```
   Envía: "Hola"
   ```

2. **El bot debería responder:**
   ```
   ¡Hola! Soy el asistente de La Birrita 🍺
   ¿En qué puedo ayudarte hoy?
   ```

## 🔍 **DEBUGGING**

### **Ver logs del webhook:**
```bash
# En terminal donde corre el servidor
# Deberías ver logs como:
# "Received WhatsApp webhook: ..."
# "Processing message from +542616977056: ..."
# "Bot response: ..."
```

### **Probar manualmente el bot:**
```bash
curl -X POST "http://localhost:3001/api/test-bot" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola",
    "phone": "2616977056"
  }'
```

## ✅ **FUNCIONALIDADES DEL BOT:**

### 🍺 **El bot puede:**
- Responder preguntas sobre La Birrita
- Tomar reservas
- Consultar puntos de fidelidad
- Recomendar productos
- Manejar consultas generales

### 📝 **Ejemplos de conversación:**
```
Usuario: "Hola, quiero hacer una reserva"
Bot: "¡Perfecto! ¿Para cuántas personas y qué día?"

Usuario: "Para 4 personas el viernes"
Bot: "Excelente, ¿a qué hora prefieres?"

Usuario: "¿Cuántos puntos tengo?"
Bot: "Consultando tus puntos... Tienes 250 puntos acumulados"
```

## 🚀 **¡LISTO!**

Una vez configurado, tendrás:
- ✅ Automatizaciones con promociones reales
- ✅ Chat bidireccional con IA
- ✅ Bot que puede tomar reservas
- ✅ Integración completa WhatsApp Business

¡Tu sistema estará 100% operativo! 🎉
