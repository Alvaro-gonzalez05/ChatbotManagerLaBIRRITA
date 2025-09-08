// Test para el sistema VIP automático
console.log('🧪 Testeando endpoint VIP automático...\n');

async function testVipCron() {
  try {
    const response = await fetch('http://localhost:3000/api/cron/vip-evaluation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Resultado del cron VIP automático:');
    console.log('📊 Resumen:', result.summary);
    console.log('🎯 Clientes promocionados:', result.totalPromoted);
    console.log('🏢 Negocios procesados:', result.processedBusinesses);
    console.log('🕒 Timestamp:', result.timestamp);
    
    if (result.success) {
      console.log('\n🎉 ¡Sistema VIP automático funcionando correctamente!');
      console.log('📅 Configurado para ejecutarse cada día a las 2:00 AM');
    }

  } catch (error) {
    console.error('❌ Error testeando:', error.message);
  }
}

testVipCron();
