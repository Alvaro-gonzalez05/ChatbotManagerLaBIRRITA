# IDs de Pagos de Prueba - MercadoPago Sandbox

## 💳 IDs de Pagos de Prueba que puedes usar:

### ✅ Pagos APROBADOS (para probar confirmación exitosa):
- `1234567890` - Pago aprobado de $1000
- `9876543210` - Pago aprobado de $5000  
- `1111111111` - Pago aprobado de $10000
- `5555555555` - Pago aprobado de $15000

### ⏳ Pagos PENDIENTES (para probar cuando no está confirmado):
- `2222222222` - Pago pendiente
- `3333333333` - Pago en proceso

### ❌ Pagos RECHAZADOS (para probar errores):
- `4444444444` - Pago rechazado
- `7777777777` - Pago cancelado

## 🧪 Cómo usar para probar:

1. **Completa la reserva en WhatsApp** hasta que pida el número de transferencia
2. **Envía uno de estos IDs** al bot
3. **Observa la respuesta** según el estado del pago

## 📝 Ejemplo de prueba:

```
Tu: "Hola, quiero reservar"
Bot: "¿Para qué día, cuántas personas, etc?"
Tu: "Sábado, 10 personas, baile"  
Bot: "Transferí $10000 y enviame el número"
Tu: "1111111111"
Bot: ✅ "Reserva confirmada!" o ❌ "Pago no válido"
```

## 🔧 Si quieres crear pagos reales de prueba:

Ejecuta: `node test-mercadopago.js`
