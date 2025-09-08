import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing point_loads table access...')

    // 1. Probar lectura de la tabla
    const { data: readData, error: readError } = await supabase
      .from('point_loads')
      .select('*')
      .limit(5)

    console.log('📖 Read test:', { readData, readError })

    // 2. Probar estructura de la tabla
    const { data: tableInfo, error: tableError } = await supabase
      .from('point_loads')
      .select('*')
      .limit(1)

    console.log('🏗️ Table structure test:', { tableInfo, tableError })

    // 3. Probar inserción simple con UUIDs válidos
    const testRecord = {
      business_id: 'f2a24619-5016-490c-9dc9-dd08fd6549b3', // UUID válido del business
      customer_id: '1aac5fce-233a-4f31-96c2-98137e258d90', // UUID válido de customer
      customer_phone: '+573001234567',
      amount_spent: 0,
      points_awarded: 10,
      loaded_by: null // Null para sistema
    }

    console.log('📝 Attempting to insert test record:', testRecord)

    const { data: insertData, error: insertError } = await supabase
      .from('point_loads')
      .insert(testRecord)
      .select()

    console.log('✅ Insert test result:', { insertData, insertError })

    // 4. Si la inserción funcionó, eliminar el registro de prueba
    if (insertData && insertData.length > 0) {
      const { error: deleteError } = await supabase
        .from('point_loads')
        .delete()
        .eq('customer_id', '1aac5fce-233a-4f31-96c2-98137e258d90')
        .eq('points_awarded', 10)

      console.log('🗑️ Cleanup test:', { deleteError })
    }

    return NextResponse.json({
      success: true,
      tests: {
        read: { data: readData, error: readError },
        structure: { data: tableInfo, error: tableError },
        insert: { data: insertData, error: insertError }
      }
    })

  } catch (error: any) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 })
  }
}
