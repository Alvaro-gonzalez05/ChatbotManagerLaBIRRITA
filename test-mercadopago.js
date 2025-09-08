// Script para crear un pago de prueba en MercadoPago
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configurar con tu access token de prueba
const client = new MercadoPagoConfig({
  accessToken: 'TEST-7543429883495097-090223-01d3c06bea105b09688460c1d88c7315-1534590544',
});

const payment = new Payment(client);

async function crearPagoDePrueba() {
  try {
    console.log('🧪 Creando pago de prueba...');
    
    // Crear un pago simulado
    const paymentData = {
      transaction_amount: 10000, // $10,000 para 10 personas
      description: 'Reserva La Birrita Garden - 10 personas - Sábado Baile',
      payment_method_id: 'master', // Tarjeta de crédito simulada
      payer: {
        email: 'test_user_123@testuser.com',
        identification: {
          type: 'DNI',
          number: '12345678'
        }
      },
      external_reference: 'RESERVA-SAB-10P-' + Date.now(),
      status: 'approved', // Simular que ya está aprobado
      currency_id: 'ARS'
    };

    const result = await payment.create({ body: paymentData });
    
    console.log('✅ Pago de prueba creado exitosamente!');
    console.log('📊 Datos del pago:');
    console.log(`   🆔 ID: ${result.id}`);
    console.log(`   💰 Monto: $${result.transaction_amount}`);
    console.log(`   📅 Estado: ${result.status}`);
    console.log(`   🔍 Referencia: ${result.external_reference}`);
    console.log('');
    console.log('🤖 Para probar el bot, envía este mensaje:');
    console.log(`   "${result.id}"`);
    console.log('');
    console.log('🔄 O también puedes probar con:');
    console.log(`   "Mi transferencia es: ${result.id}"`);
    console.log(`   "ID: ${result.id}"`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error creando pago de prueba:', error);
    
    // Si la API no permite crear pagos directamente, simular uno
    const mockPaymentId = `MP${Date.now()}`;
    console.log('');
    console.log('🎭 Usando ID simulado para pruebas:');
    console.log(`   🆔 ID simulado: ${mockPaymentId}`);
    console.log('');
    console.log('🤖 Para probar el bot, envía:');
    console.log(`   "${mockPaymentId}"`);
  }
}

// Ejecutar la creación del pago
crearPagoDePrueba();
