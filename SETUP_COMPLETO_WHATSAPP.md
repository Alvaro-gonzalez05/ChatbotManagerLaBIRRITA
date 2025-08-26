# 🚀 Configuración Completa de WhatsApp Business API para La Birrita

## 📋 Paso a Paso para Configuración

### 1. **Configurar en Meta for Developers**

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Crea una nueva App → **Business** 
3. Agrega **WhatsApp Business Platform**
4. Obtén los siguientes datos:

```bash
# Variables que necesitas obtener:
WHATSAPP_ACCESS_TOKEN=EAAl... (Token permanente)
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=tu_token_personalizado
```

### 2. **Configurar Variables de Entorno**

Crea archivo `.env.local` con:

```env
# WhatsApp Business API (OBLIGATORIO)
WHATSAPP_ACCESS_TOKEN=tu_access_token_permanente
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_VERIFY_TOKEN=LaBirrita_webhook_2024
WHATSAPP_API_VERSION=v19.0

# Supabase (ya configurado)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Seguridad Cron
CRON_SECRET=cleanup_contexts_secure_token_2024

# OpenAI
OPENAI_API_KEY=tu_openai_key

# Negocio
BUSINESS_NAME="La Birrita"
BUSINESS_PHONE="+54911xxxxxxxx"
```

### 3. **Crear Plantillas en Meta Business Manager**

Ve a **Meta Business Manager → WhatsApp → Message Templates** y crea:

#### 🎂 **Template: birthday_reminder** (MARKETING)
```
Name: birthday_reminder
Category: MARKETING  
Language: Spanish

Header: 🎂 ¡Feliz Cumpleaños {{1}}!
Body: Se acerca tu cumpleaños y queremos celebrarlo contigo en {{2}}.

🎁 {{3}}
💰 {{4}}% de descuento especial
⭐ {{5}} puntos de regalo

¡Ven a celebrar con nosotros! 🎉

Footer: Válido por tiempo limitado

Buttons:
- Quick Reply: ¡Me interesa! 🎉
- Quick Reply: Ver ubicación 📍
```

#### ⭐ **Template: points_notification** (UTILITY)
```
Name: points_notification
Category: UTILITY
Language: Spanish

Header: ⭐ Puntos Actualizados

Body: ¡Hola {{1}}! Acabas de sumar {{2}} puntos a tu cuenta.

📊 Total de puntos: {{3}}
🎯 Tu próxima recompensa: {{4}}
💎 Te faltan {{5}} puntos

¡Gracias por elegirnos!

Footer: Consulta tus recompensas disponibles

Buttons:
- Quick Reply: Ver recompensas 🎁
```

#### 👑 **Template: inactive_customer_vip** (MARKETING)
```
Name: inactive_customer_vip
Category: MARKETING
Language: Spanish

Header: 👑 Te extrañamos, {{1}}

Body: Como cliente VIP con {{2}} visitas, queremos verte de nuevo en {{3}}.

🎯 {{4}}
💝 {{5}}% de descuento especial
⭐ {{6}} puntos de bienvenida

¡Ven y descubre todo lo que tenemos para ti!

Footer: Oferta exclusiva para clientes VIP

Buttons:
- Quick Reply: ¡Voy a visitarlos! 😊
- Quick Reply: Ver promoción 🎁
```

#### 👋 **Template: inactive_customer_new** (MARKETING)
```
Name: inactive_customer_new
Category: MARKETING
Language: Spanish

Header: 👋 ¡Hola {{1}}!

Body: Te extrañamos en {{2}}. Sabemos que solo has visitado {{3}} veces y queremos verte más seguido:

🎯 {{4}}
💝 {{5}}% de descuento especial
⭐ {{6}} puntos de bienvenida

¡Ven y descubre todo lo que tenemos para ti!

Footer: Oferta especial para nuevos clientes

Buttons:
- Quick Reply: ¡Me interesa! 😊
- Quick Reply: Ver ubicación 📍
```

#### 📝 **Template: missing_data_request** (UTILITY)
```
Name: missing_data_request
Category: UTILITY
Language: Spanish

Header: 📝 Completa tu perfil

Body: ¡Hola {{1}}! Para brindarte una experiencia más personalizada en {{2}}, nos gustaría conocerte mejor.

¿Podrías completar tu {{3}}?

Como agradecimiento:
⭐ {{4}} puntos extra
🎁 Sorpresa especial en tu próxima visita

Solo toma 30 segundos completarlo.

Footer: Tu información está segura con nosotros

Buttons:
- Quick Reply: Completar datos ✏️
- Quick Reply: Más tarde ⏰
```

### 4. **Agregar tu número de WhatsApp como tester**

1. En **Meta Business Manager → WhatsApp**
2. Ve a **Configuration → Phone numbers**
3. Agrega tu número personal para pruebas
4. Acepta el mensaje de confirmación

### 5. **Configurar Webhook** (opcional para mensajes entrantes)

```bash
URL: https://tu-dominio.vercel.app/api/webhook/whatsapp
Verify Token: LaBirrita_webhook_2024
```

### 6. **Probar las Automatizaciones**

Ejecuta las pruebas:

```bash
# 1. Probar conexión básica
curl "http://localhost:3000/api/test/whatsapp?to=549111234567&template=hello_world"

# 2. Probar plantilla específica
curl -X POST http://localhost:3000/api/test/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "549111234567",
    "templateName": "birthday_reminder",
    "parameters": ["Juan", "Juan", "La Birrita", "Oferta especial", "20", "100"]
  }'

# 3. Probar automatizaciones
curl -X POST http://localhost:3000/api/test/automations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "birthday",
    "customerPhone": "549111234567"
  }'
```

### 7. **Activar Automatizaciones en Dashboard**

1. Ve a `/dashboard/loyalty`
2. Crea promociones asociadas
3. Configura las automatizaciones:
   - ✅ Activa cada automatización
   - ✅ Selecciona plantilla Meta correspondiente
   - ✅ Asocia promoción si aplica
   - ✅ Configura frecuencia

### 8. **Verificar Cron Jobs**

Los cron jobs ya están configurados en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/birthday-automations",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/points-notifications", 
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/inactive-customers",
      "schedule": "0 10 * * 1"
    },
    {
      "path": "/api/cron/missing-fields",
      "schedule": "0 11 * * *"
    }
  ]
}
```

## ✅ **Lista de Verificación Final**

- [ ] Variables de entorno configuradas
- [ ] 5 plantillas creadas y aprobadas en Meta
- [ ] Número de prueba agregado
- [ ] Webhook configurado (opcional)
- [ ] Automatizaciones activadas en dashboard
- [ ] Promociones asociadas creadas
- [ ] Pruebas ejecutadas exitosamente

## 🚀 **¡Sistema 100% Operativo!**

Una vez completados estos pasos, tu sistema de automatizaciones estará completamente funcional y listo para producción.

### 📊 **Monitoreo**
- Logs en consola de Vercel
- Tabla `automation_logs` en Supabase
- Dashboard de métricas en `/dashboard/loyalty`

¡Tu chatbot de La Birrita está listo para funcionar! 🍺
