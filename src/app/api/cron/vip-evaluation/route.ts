import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  console.log('🤖 Iniciando evaluación VIP automática...')
  
  try {
    const supabase = createClient()
    
    // Obtener todos los negocios con configuración VIP
    const { data: businesses, error: businessError } = await supabase
      .from('loyalty_settings')
      .select('business_id, vip_criteria')
      .not('vip_criteria', 'is', null)

    if (businessError) throw businessError

    let totalPromoted = 0
    let processedBusinesses = 0

    for (const business of businesses || []) {
      if (!business.vip_criteria) continue

      console.log(`📊 Procesando business: ${business.business_id}`)
      
      // Obtener todos los clientes del negocio
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.business_id)

      if (customerError) {
        console.error(`❌ Error obteniendo customers para ${business.business_id}:`, customerError)
        continue
      }

      const criteria = business.vip_criteria
      const now = new Date()
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      let businessPromoted = 0

      for (const customer of customers || []) {
        const lastInteraction = new Date(customer.last_interaction)
        const isRecentlyActive = lastInteraction >= oneMonthAgo

        // Calcular actividad mensual
        const monthlyVisits = isRecentlyActive ? customer.visit_count : 0
        const monthlySpending = isRecentlyActive ? customer.total_spent * 0.3 : 0

        // Evaluar criterios VIP
        const meetsMonthlyVisits = monthlyVisits >= criteria.monthly_visits
        const meetsMonthlySpending = monthlySpending >= criteria.monthly_spending
        const meetsTotalVisits = customer.visit_count >= criteria.total_visits
        const meetsTotalSpending = customer.total_spent >= criteria.total_spending

        const isVipEligible = (
          meetsMonthlyVisits || 
          meetsMonthlySpending || 
          meetsTotalVisits || 
          meetsTotalSpending
        )

        if (isVipEligible) {
          // Verificar si ya es VIP
          const currentTags = customer.tags || []
          if (!currentTags.includes('VIP')) {
            const updatedTags = [...currentTags, 'VIP']
            
            // Preparar razón de promoción
            let promotionReason = []
            if (meetsMonthlyVisits) promotionReason.push(`${monthlyVisits} visitas mensuales`)
            if (meetsMonthlySpending) promotionReason.push(`$${monthlySpending.toLocaleString()} gasto mensual`)
            if (meetsTotalVisits) promotionReason.push(`${customer.visit_count} visitas totales`)
            if (meetsTotalSpending) promotionReason.push(`$${customer.total_spent.toLocaleString()} gasto total`)
            
            // Actualizar customer a VIP
            const { error: updateError } = await supabase
              .from('customers')
              .update({ 
                tags: updatedTags,
                notes: customer.notes ? 
                  `${customer.notes}\n[AUTO-VIP CRON] Promocionado automáticamente por: ${promotionReason.join(', ')} - ${now.toLocaleDateString()}` :
                  `[AUTO-VIP CRON] Promocionado automáticamente por: ${promotionReason.join(', ')} - ${now.toLocaleDateString()}`
              })
              .eq('id', customer.id)

            if (!updateError) {
              businessPromoted++
              totalPromoted++
              console.log(`✅ ${customer.name || customer.phone} promocionado a VIP`)
            } else {
              console.error(`❌ Error promocionando ${customer.phone}:`, updateError)
            }
          }
        }
      }

      console.log(`📊 Business ${business.business_id}: ${businessPromoted} clientes promocionados`)
      processedBusinesses++
    }

    const summary = `VIP automático completado: ${totalPromoted} clientes promocionados en ${processedBusinesses} negocios`
    console.log(`🎉 ${summary}`)

    return NextResponse.json({
      success: true,
      summary,
      totalPromoted,
      processedBusinesses,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error en evaluación VIP automática:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
