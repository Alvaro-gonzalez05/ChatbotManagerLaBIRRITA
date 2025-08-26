const { WhatsAppBusinessApiService } = require('./dist/services/whatsappBusinessApi.js');

async function testWhatsApp() {
  try {
    console.log('🧪 Iniciando prueba de WhatsApp...');
    
    // Crear instancia del servicio
    const whatsapp = new WhatsAppBusinessApiService();
    
    // Probar envío de template hello_world
    console.log('📤 Enviando template hello_world...');
    const result = await whatsapp.sendTemplate('+542616977056', 'hello_world', 'en_US');
    
    console.log('✅ Resultado:', result);
    
    // También probar con un mensaje de texto simple
    console.log('📤 Enviando mensaje de texto...');
    const textResult = await whatsapp.sendMessage('+542616977056', '¡Hola Juan Carlos! 🎂 Este es un mensaje de prueba desde La Birrita para confirmar que las automatizaciones funcionan correctamente.');
    
    console.log('✅ Resultado texto:', textResult);
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
  }
}

testWhatsApp();