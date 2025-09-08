const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = 'https://xcunhibytmtwqqadlloi.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdW5oaWJ5dG10d3FxYWRsbG9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzMTI0NywiZXhwIjoyMDcwMDA3MjQ3fQ.GhRCQek6g3ikKglPvu8v_hLfKfPUd3aFIFRP4rYp-PY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestCustomers() {
  console.log('🧪 Creando clientes de prueba para sistema de cumpleaños...')
  
  try {
    // 1. Cliente con cumpleaños HOY (27/08) - Para probar puntos
    const customerToday = {
      business_id: 1, // Asume que existe business_id = 1
      name: 'Juan Cumpleañero',
      phone: '+573001234567',
      email: 'juan.cumple@test.com',
      birthday: '1990-08-27', // Cumpleaños HOY
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // 2. Cliente con cumpleaños en 7 días (03/09) - Para probar recordatorio
    const customerIn7Days = {
      business_id: 1,
      name: 'María Recordatorio',
      phone: '+573009876543',
      email: 'maria.recordatorio@test.com',
      birthday: '1985-09-03', // Cumpleaños en 7 días
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insertar clientes
    const { data: insertedCustomers, error: insertError } = await supabase
      .from('customers')
      .insert([customerToday, customerIn7Days])
      .select()

    if (insertError) {
      console.error('❌ Error insertando clientes:', insertError)
      return
    }

    console.log('✅ Clientes de prueba creados:')
    console.log('📅 Juan Cumpleañero - Cumpleaños HOY (27/08)')
    console.log('📅 María Recordatorio - Cumpleaños en 7 días (03/09)')

    // Verificar automatizaciones existentes
    const { data: automations, error: autoError } = await supabase
      .from('automations')
      .select('*')
      .eq('automation_type', 'birthday')
      .eq('is_active', true)

    if (autoError) {
      console.error('❌ Error obteniendo automatizaciones:', autoError)
      return
    }

    console.log('\n🤖 Automatizaciones activas:')
    automations.forEach(auto => {
      console.log(`- ${auto.name} (trigger_days: ${auto.trigger_days})`)
    })

    console.log('\n🧪 PRUEBAS SUGERIDAS:')
    console.log('1. Ejecutar cron con trigger_days=0 para otorgar puntos a Juan')
    console.log('2. Ejecutar cron con trigger_days=7 para enviar recordatorio a María')
    console.log('\nComandos:')
    console.log('curl -X GET "http://localhost:3000/api/cron/birthday-automations" -H "Authorization: Bearer cleanup_contexts_secure_token_2024"')

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar
createTestCustomers()
