# Configuración de Limpieza Automática de Contextos de Conversación

Este sistema limpia automáticamente los contextos de conversación expirados cada 20 minutos.

## Opción 1: Cron Job Local (recomendado para desarrollo)

Agrega esta línea a tu crontab para ejecutar la limpieza cada 20 minutos:

```bash
# Abrir crontab
crontab -e

# Agregar esta línea (ejecuta cada 20 minutos)
*/20 * * * * /home/alva/Documentos/Proyectos/claude/frontend/cleanup-cron.sh >> /tmp/context-cleanup.log 2>&1
```

## Opción 2: Servicio Externo de Cron (recomendado para producción)

### Con cron-job.org o similar:

1. URL: `https://tu-dominio.com/api/cron/cleanup-contexts`
2. Método: GET
3. Headers: `Authorization: Bearer cleanup_contexts_secure_token_2024`
4. Frecuencia: Cada 20 minutos

### Ejemplo con curl:

```bash
curl -X GET https://tu-dominio.com/api/cron/cleanup-contexts \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"
```

## Opción 3: Vercel Cron Jobs (para producción en Vercel)

Crear archivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-contexts",
      "schedule": "*/20 * * * *"
    }
  ]
}
```

## Prueba Manual

Puedes probar la limpieza manualmente:

```bash
# Limpieza básica
curl -X POST http://localhost:3000/api/admin/cleanup-conversation-context

# Limpieza con autenticación (cron endpoint)
curl -X GET http://localhost:3000/api/cron/cleanup-contexts \
  -H "Authorization: Bearer cleanup_contexts_secure_token_2024"
```

## Monitoreo

Los logs de limpieza aparecerán en:
- Console de Next.js (desarrollo)
- Logs de Vercel (producción)
- `/tmp/context-cleanup.log` (si usas cron local)

## Configuración de Tiempo

Para cambiar el tiempo de expiración de 20 minutos a otro valor:

1. Actualizar en `src/services/botService.ts` línea 582
2. Actualizar la migración SQL en Supabase
3. Actualizar la frecuencia del cron job