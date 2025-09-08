# Sistema de Automatizaciones Completo 🤖

## Resumen

Tu sistema de automatizaciones ya está completamente funcional y configurado para **La Birrita Garden** (business_id: `f2a24619-5016-490c-9dc9-dd08fd6549b3`).

## ✅ Automatizaciones Implementadas

### 1. 🎂 **Recordatorio de Cumpleaños** (`birthday_reminder`)
- **Trigger**: 7 días antes del cumpleaños
- **Template WhatsApp**: `birthday_reminder`
- **Parámetros**: 
  - `{{1}}` (Header): Nombre del cliente
  - `{{1}}` (Body): Título/descripción de la promoción especial
  - `{{2}}` (Body): Puntos de regalo

### 2. ⭐ **Notificación de Puntos** (`points_notification`) 🔥 **AUTOMÁTICA**
- **Trigger**: **INMEDIATAMENTE** al cargar puntos al cliente
- **Template WhatsApp**: `points_notification`
- **Parámetros**:
  - `{{1}}`: Nombre del cliente
  - `{{2}}`: Puntos que acaba de sumar
  - `{{3}}`: Recompensas disponibles
- **🎯 Comportamiento**: Se ejecuta automáticamente en `/api/points/load`

### 3. 💤 **Cliente Inactivo VIP** (`inactive_customer_vip`)
- **Trigger**: 30 días sin interacción (clientes con 4+ visitas)
- **Template WhatsApp**: `inactive_customer_vip`
- **Parámetros**:
  - `{{1}}` (Header): Nombre del cliente
  - `{{1}}` (Body): Promoción especial

### 4. 📝 **Solicitud de Datos Faltantes** (`missing_data_request`)
- **Trigger**: 3 días después de registro para clientes sin cumpleaños
- **Template WhatsApp**: `missing_data_request`
- **Parámetros**:
  - `{{1}}`: Nombre del cliente
  - `{{2}}`: Campo faltante
  - `{{3}}`: Puntos de recompensa por completar

## 🚀 Cómo Ejecutar las Automatizaciones

### Opción 1: API Endpoints

```bash
# Procesar TODAS las automatizaciones
GET /api/automations

# Procesar solo para tu business
GET /api/automations?business_id=f2a24619-5016-490c-9dc9-dd08fd6549b3

# Probar automatización específica
GET /api/automations?test_phone=54911234567&test_type=birthday
```

### Opción 2: Script de Prueba

```bash
# Ejecutar desde la carpeta frontend
chmod +x test-automations.sh
./test-automations.sh
```

### Opción 3: Cron Job (Recomendado para Producción)

```bash
# Agregar al crontab para ejecutar cada hora
0 * * * * curl -X GET "https://tu-dominio.vercel.app/api/automations?business_id=f2a24619-5016-490c-9dc9-dd08fd6549b3"
```

## 📊 Automatizaciones Configuradas en tu Business

| Automatización | Estado | Tipo | Template | Promoción |
|---|---|---|---|---|
| Recordatorio de Cumpleaños | ✅ Activa | `birthday` | `birthday_reminder` | Feliz Cumpleaños! 🎂 (25% desc) |
| Reactivación Clientes Inactivos | ✅ Activa | `inactive_customers` | `inactive_customer_vip` | Te extrañamos! 💔 (20% desc) |
| Notificación de Puntos | ✅ Activa | `points_notification` | `points_notification` | Sin promoción específica |
| Solicitud de Datos Faltantes | ✅ Activa | `missing_field` | `missing_data_request` | Sin promoción específica |
| Puntos de Cumpleaños | ✅ Activa | `birthday` | No envía mensaje | Solo otorga puntos |

## 🔄 Flujo de Funcionamiento

### Cumpleaños
1. **7 días antes**: Envía `birthday_reminder` con promoción especial
2. **El día exacto**: Otorga puntos de cumpleaños automáticamente (sin mensaje)

### Puntos 🔥 **AUTOMÁTICO**
1. **Al cargar puntos**: Envía `points_notification` **INMEDIATAMENTE**
2. **Incluye**: Puntos sumados + próxima recompensa disponible
3. **Se ejecuta**: Automáticamente en `/api/points/load` sin necesidad de cron

### Clientes Inactivos
1. **Detecta**: Clientes sin interacción por 30+ días
2. **Segmenta**: VIP (4+ visitas) vs Nuevos (1-3 visitas)
3. **Envía**: Template correspondiente con promoción específica

### Datos Faltantes
1. **Detecta**: Clientes registrados hace 3+ días sin cumpleaños
2. **Envía**: Solicitud amigable con puntos de incentivo

## 🗂️ Base de Datos

### Tablas Principales:
- `automations`: Configuración de automatizaciones
- `promotions`: Promociones vinculadas
- `customers`: Datos de clientes
- `automation_logs`: Registro de envíos

### Campos Importantes:
- `meta_template_name`: Nombre del template de WhatsApp
- `promotion_id`: ID de promoción vinculada
- `trigger_days`: Días de anticipación/retraso
- `target_audience`: Segmentación (`all`, `birthday_near`, `low_visits`)

## ⚡ Templates de WhatsApp Configurados

Los templates están configurados en `/src/lib/whatsapp-templates.ts`:

```typescript
points_notification: {
  bodyParameters: 3, // nombre, puntos, recompensas
  language: 'es_AR'
}

birthday_reminder: {
  headerParameters: 1, // nombre
  bodyParameters: 2,   // promoción, puntos
  language: 'es_AR'
}

inactive_customer_vip: {
  headerParameters: 1, // nombre
  bodyParameters: 1,   // promoción
  language: 'es_AR'
}

missing_data_request: {
  bodyParameters: 3,   // nombre, campo, puntos
  language: 'es_AR'
}
```

## 🧪 Testing

### Probar Notificación de Puntos (AUTOMÁTICA):
```bash
# Cargar puntos a un cliente - enviará notificación automáticamente
curl -X POST "http://localhost:3000/api/points/load" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "uuid-del-cliente",
    "business_id": "f2a24619-5016-490c-9dc9-dd08fd6549b3",
    "customer_phone": "549XXXXXXXX",
    "amount_spent": 1000,
    "points_awarded": 50,
    "loaded_by": "employee-id"
  }'
```

### Probar Cumpleaños:
```bash
curl "http://localhost:3000/api/automations?test_phone=549XXXXXXXX&test_type=birthday"
```

### Probar Otras Automatizaciones:
```bash
# Solo clientes inactivos y cumpleaños (puntos ya es automático)
curl "http://localhost:3000/api/automations?business_id=f2a24619-5016-490c-9dc9-dd08fd6549b3"
```

### Verificar Logs:
Los logs se guardan en `automation_logs` con:
- `automation_id`: ID de la automatización
- `customer_id`: ID del cliente
- `message_sent`: Contenido del mensaje
- `status`: `sent`, `failed`, `error`

## 📱 Integración con WhatsApp Business

- Usa WhatsApp Business API con templates aprobados
- Formatea números argentinos automáticamente (agrega `54`)
- Maneja errores y reintentos
- Registra todos los envíos

## 🎯 Próximos Pasos

1. **Producción**: Cambiar URL base en scripts a tu dominio real
2. **Cron**: Configurar ejecución automática cada hora
3. **Monitoreo**: Revisar `automation_logs` regularmente
4. **Templates**: Crear más templates en Meta Business si necesitas

## ✅ Todo Está Listo

Tu sistema de automatizaciones está:
- ✅ Completamente implementado
- ✅ Configurado para tu business
- ✅ Probado con templates reales
- ✅ Integrado con promociones
- ✅ Registrando logs
- ✅ Listo para producción

¡Solo falta ponerlo en producción y configurar el cron job! 🚀