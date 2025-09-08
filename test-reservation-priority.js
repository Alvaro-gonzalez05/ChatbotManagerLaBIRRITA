// Test script para verificar la prioridad de detección de reservas
const testReservationPriority = async () => {
  console.log('🧪 Testeando prioridad de detección de reservas...\n');
  
  const testMessage = 'hola quiero reservar una mesa para el día sábado, a las 20 horas para 2 personas';
  console.log('📝 Mensaje de prueba:', testMessage);
  
  try {
    const response = await fetch('http://localhost:3000/api/test-bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        phone: '+5492616977056'
      })
    });
    
    const data = await response.json();
    
    console.log('\n✅ Respuesta del bot:');
    console.log(data.response);
    
    // Verificar si detectó reserva o horarios
    if (data.response.includes('reserva') || data.response.includes('mesa') || data.response.includes('disponibilidad')) {
      console.log('\n🎯 ¡CORRECTO! El bot detectó una RESERVA');
    } else if (data.response.includes('horario') || data.response.includes('abierto') || data.response.includes('cerrado')) {
      console.log('\n❌ ERROR: El bot detectó HORARIOS en lugar de reserva');
    } else {
      console.log('\n⚠️ Respuesta inesperada');
    }
    
    console.log('\n📊 Detalles de detección:');
    console.log('Intent detectado:', data.intent || 'No disponible');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testReservationPriority();
