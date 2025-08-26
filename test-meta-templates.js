const { WhatsAppBusinessApiService } = require('./dist/services/whatsappBusinessApi.js');

async function testMetaTemplates() {
  try {
    console.log('🧪 Probando plantillas Meta personalizadas...\n');
    
    const whatsapp = new WhatsAppBusinessApiService();
    const testPhone = '+542616977056'; // Tu número
    
    console.log('='.repeat(60));
    console.log('🎂 PRUEBA 1: PLANTILLA birthday_reminder');
    console.log('='.repeat(60));
    
    const birthdayParams = [
      'Juan Carlos', // {{1}} - nombre
      'La Birrita', // {{2}} - negocio
      'Promo cumpleañero', // {{3}} - título promoción
      '25', // {{4}} - descuento %
      '100' // {{5}} - puntos extra
    ];
    
    console.log('📤 Parámetros:', birthdayParams);
    const result1 = await whatsapp.sendTemplateWithParameters(
      testPhone, 
      'birthday_reminder', 
      birthdayParams, 
      'es'
    );
    console.log('✅ Resultado birthday_reminder:', result1 ? 'EXITOSO' : 'ERROR');
    
    // Esperar 2 segundos entre envíos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n' + '='.repeat(60));
    console.log('⭐ PRUEBA 2: PLANTILLA points_notification');
    console.log('='.repeat(60));
    
    const pointsParams = [
      'Juan Carlos', // {{1}} - nombre
      '50', // {{2}} - puntos agregados
      '250', // {{3}} - puntos totales
      'Cerveza gratis', // {{4}} - próxima recompensa
      '50' // {{5}} - puntos faltantes
    ];
    
    console.log('📤 Parámetros:', pointsParams);
    const result2 = await whatsapp.sendTemplateWithParameters(
      testPhone, 
      'points_notification', 
      pointsParams, 
      'es'
    );
    console.log('✅ Resultado points_notification:', result2 ? 'EXITOSO' : 'ERROR');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n' + '='.repeat(60));
    console.log('💤 PRUEBA 3: PLANTILLA inactive_customer_vip');
    console.log('='.repeat(60));
    
    const vipParams = [
      'Juan Carlos', // {{1}} - nombre
      '8', // {{2}} - número de visitas
      'La Birrita', // {{3}} - negocio
      'Noche VIP', // {{4}} - promoción
      '30', // {{5}} - descuento %
      '200' // {{6}} - puntos extra
    ];
    
    console.log('📤 Parámetros:', vipParams);
    const result3 = await whatsapp.sendTemplateWithParameters(
      testPhone, 
      'inactive_customer_vip', 
      vipParams, 
      'es'
    );
    console.log('✅ Resultado inactive_customer_vip:', result3 ? 'EXITOSO' : 'ERROR');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 PRUEBA 4: PLANTILLA missing_data_request');
    console.log('='.repeat(60));
    
    const missingParams = [
      'Juan Carlos', // {{1}} - nombre
      'La Birrita', // {{2}} - negocio
      'fecha de cumpleaños', // {{3}} - campo faltante
      '25' // {{4}} - puntos recompensa
    ];
    
    console.log('📤 Parámetros:', missingParams);
    const result4 = await whatsapp.sendTemplateWithParameters(
      testPhone, 
      'missing_data_request', 
      missingParams, 
      'es'
    );
    console.log('✅ Resultado missing_data_request:', result4 ? 'EXITOSO' : 'ERROR');
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    console.log('🎂 birthday_reminder:', result1 ? '✅ FUNCIONA' : '❌ FALLA');
    console.log('⭐ points_notification:', result2 ? '✅ FUNCIONA' : '❌ FALLA');
    console.log('💤 inactive_customer_vip:', result3 ? '✅ FUNCIONA' : '❌ FALLA');
    console.log('📝 missing_data_request:', result4 ? '✅ FUNCIONA' : '❌ FALLA');
    
    const totalOk = [result1, result2, result3, result4].filter(Boolean).length;
    console.log(`\n🏆 RESULTADO FINAL: ${totalOk}/4 plantillas funcionando correctamente`);
    
    if (totalOk === 4) {
      console.log('🎉 ¡TODAS LAS PLANTILLAS FUNCIONAN PERFECTAMENTE!');
    } else {
      console.log('⚠️  Algunas plantillas necesitan revisión en Meta Business Manager');
    }
    
  } catch (error) {
    console.error('❌ Error en prueba de plantillas:', error.message);
    console.error('📋 Detalles:', error.response?.data || error.stack);
  }
}

testMetaTemplates();