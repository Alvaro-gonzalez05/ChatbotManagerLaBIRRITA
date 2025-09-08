// Test para notificación de puntos arreglada
console.log('🧪 Probando notificación de puntos arreglada...\n');

async function testPointsNotification() {
  try {
    // Probar la notificación con 3 parámetros como debe ser
    const testData = {
      customer_phone: '+5492616977056',
      customer_name: 'Alvaro',
      points_added: 500,
      total_points: 1100,
      business_id: '5b0adca5-d86a-4cc3-82fd-4bdb3d07348c'
    };

    console.log('📤 Enviando notificación de puntos con:', testData);

    const response = await fetch('http://localhost:3000/api/whatsapp/send-points-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Notificación enviada exitosamente!');
      console.log('📱 Template:', result.templateName);
      console.log('📋 Parámetros enviados:', result.parameters);
      console.log('📞 Enviado a:', result.to);
    } else {
      console.log('❌ Error en notificación:', result.error);
      if (result.details) {
        console.log('📋 Detalles:', result.details);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPointsNotification();
