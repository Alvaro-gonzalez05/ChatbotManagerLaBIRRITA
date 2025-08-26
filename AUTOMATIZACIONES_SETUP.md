# 🤖 Configuración Completa de Automatizaciones

## ✅ Automatizaciones Implementadas

### 1. 🎂 **Recordatorio de Cumpleaños**
- **Cuándo:** 7 días antes del cumpleaños (configurable)
- **Audiencia:** Clientes con cumpleaños registrado
- **Plantilla Meta:** `birthday_reminder`
- **Promociones:** ✅ Configurable desde dashboard
- **Frecuencia:** Una vez, Diario, Semanal, Mensual

### 2. ⭐ **Notificación de Puntos**
- **Cuándo:** Inmediato tras cargar puntos (1 hora de ventana)
- **Audiencia:** Clientes que recién cargaron puntos  
- **Plantilla Meta:** `points_notification`
- **Promociones:** ✅ Opcional
- **Frecuencia:** Inmediato, Diario, Semanal

### 3. 💤 **Clientes Inactivos**
- **Cuándo:** 30 días sin interacción (configurable)
- **Audiencias:** 
  - **VIP:** 4+ visitas (`inactive_customer_vip`)
  - **Nuevos:** 1-3 visitas (`inactive_customer_new`)
- **Promociones:** ✅ Configurable
- **Frecuencia:** Una vez, Semanal, Mensual

### 4. 📝 **Campos Faltantes**
- **Cuándo:** 3 días después de registro sin datos (configurable)
- **Audiencia:** Clientes con información incompleta
- **Campos:** Cumpleaños, Email, Nombre
- **Plantilla Meta:** `missing_data_request`
- **Promociones:** ✅ Opcional
- **Frecuencia:** Una vez, Semanal

## 🔧 Pasos de Configuración

### Paso 1: Configurar Plantillas en Meta Business

1. **Ir a Meta Business Manager**
2. **WhatsApp Business Account → Message Templates**
3. **Crear plantillas usando `whatsapp-templates.json`**

#### Plantillas a crear:
```
✅ birthday_reminder (MARKETING)
✅ points_notification (UTILITY)  
✅ inactive_customer_vip (MARKETING)
✅ inactive_customer_new (MARKETING)
✅ missing_data_request (UTILITY)
```

### Paso 2: Configurar Cron Jobs

#### Opción A: Vercel Cron (Recomendado para producción)
Crear archivo `vercel.json`:
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

#### Opción B: Servicio Externo (cron-job.org)
- **Cumpleaños:** `https://tudominio.com/api/cron/birthday-automations`
  - Frecuencia: Diario 9:00 AM
- **Puntos:** `https://tudominio.com/api/cron/points-notifications`
  - Frecuencia: Cada hora
- **Inactivos:** `https://tudominio.com/api/cron/inactive-customers`
  - Frecuencia: Lunes 10:00 AM
- **Campos:** `https://tudominio.com/api/cron/missing-fields`
  - Frecuencia: Diario 11:00 AM

**Headers requeridos:**
```
Authorization: Bearer cleanup_contexts_secure_token_2024
Content-Type: application/json
```

### Paso 3: Configurar Variables de Entorno

Agregar a `.env.local`:
```env
CRON_SECRET=cleanup_contexts_secure_token_2024
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### Paso 4: Actualizar Base de Datos

Ejecutar migración para agregar campo `meta_template_name`:
```sql
ALTER TABLE automations 
ADD COLUMN meta_template_name VARCHAR(255),
DROP COLUMN max_sends_per_customer;
```

## 🎯 Configuración desde Dashboard

### Campos Actualizados:
1. **✅ Plantilla de Meta:** Selector de plantillas oficiales
2. **✅ Promoción Asociada:** Selector visual con descuentos/puntos
3. **✅ Frecuencia de Envío:** 
   - Una vez
   - Inmediato
   - Diario  
   - Semanal
   - Mensual
4. **❌ Máximo Envíos:** ELIMINADO (audiencia ya configurada)

### Variables Dinámicas Disponibles:
- `{name}` - Nombre del cliente
- `{business_name}` - Nombre del negocio
- `{promotion_title}` - Título de la promoción
- `{discount_percentage}` - Porcentaje de descuento
- `{points_reward}` - Puntos de recompensa
- `{points_added}` - Puntos recién agregados
- `{total_points}` - Total de puntos actuales
- `{next_reward}` - Próxima recompensa disponible
- `{points_needed}` - Puntos faltantes
- `{visit_count}` - Número de visitas
- `{missing_field}` - Campo faltante específico

## 🧪 Pruebas

### Probar Manualmente:
```bash
# Todas las automatizaciones
curl -X GET http://localhost:3000/api/cron/run-automations \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"

# Solo cumpleaños
curl -X GET http://localhost:3000/api/cron/birthday-automations \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"

# Solo puntos
curl -X GET http://localhost:3000/api/cron/points-notifications \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"

# Solo inactivos
curl -X GET http://localhost:3000/api/cron/inactive-customers \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"

# Solo campos faltantes  
curl -X GET http://localhost:3000/api/cron/missing-fields \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"
```

## 📊 Monitoreo

### Logs Disponibles:
- Console de Next.js (desarrollo)
- Vercel Functions Logs (producción)
- Tabla `automation_logs` en Supabase

### Métricas a Revisar:
- Mensajes enviados vs fallidos
- Tasa de respuesta por automatización
- Conversiones por promoción
- Tiempo de ejecución de cada cron

## 🚀 ¡Todo Listo!

Las automatizaciones están completamente implementadas y listas para usar. Solo necesitas:

1. ✅ Configurar plantillas en Meta Business
2. ✅ Configurar cron jobs
3. ✅ Actualizar variables de entorno
4. ✅ Migrar base de datos
5. ✅ Activar automatizaciones desde dashboard

**¡Tu sistema de marketing automatizado está listo! 🎉**