import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const whatsapp = new WhatsAppBusinessApiService()

export async function POST(request: NextRequest) {
  try {
    const { customer_id, business_id, customer_phone, amount_spent, points_awarded, loaded_by } = await request.json()
    
    if (!customer_id || !business_id || !amount_spent || !points_awarded) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Start transaction - update customer and create point load record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('points, total_spent')
      .eq('id', customer_id)
      .single()
    
    if (customerError) throw customerError
    
    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        points: customer.points + points_awarded,
        total_spent: customer.total_spent + parseFloat(amount_spent),
        last_interaction: new Date().toISOString()
      })
      .eq('id', customer_id)
    
    if (updateError) throw updateError
    
    // Create point load record
    const { data: pointLoad, error: loadError } = await supabase
      .from('point_loads')
      .insert({
        business_id,
        customer_id,
        customer_phone,
        amount_spent: parseFloat(amount_spent),
        points_awarded,
        loaded_by,
      })
      .select()
    
    if (loadError) throw loadError

    // **ENVÍO AUTOMÁTICO DE NOTIFICACIÓN DE PUNTOS**
    await sendPointsNotification(customer_id, business_id, points_awarded, customer_phone)
    
    return NextResponse.json({ 
      success: true, 
      pointLoad: pointLoad[0],
      newPoints: customer.points + points_awarded,
      notification_sent: true
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Función para enviar notificación automática de puntos
async function sendPointsNotification(
  customerId: string, 
  businessId: string, 
  pointsAwarded: number, 
  customerPhone: string
): Promise<void> {
  try {
    console.log(`⭐ Enviando notificación automática de puntos a cliente: ${customerId}`)

    // Obtener datos del cliente
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, points')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      console.error('Error obteniendo datos del cliente:', customerError)
      return
    }

    // Buscar automatización de puntos activa para este business
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('business_id', businessId)
      .eq('automation_type', 'points_notification')
      .eq('is_active', true)
      .single()

    if (automationError || !automation) {
      console.log('No hay automatización de puntos activa para este business')
      return
    }

    console.log(`🤖 Automatización encontrada: ${automation.name}`)

    // Obtener próxima recompensa disponible
    const { data: nextReward } = await supabase
      .from('redeemable_items')
      .select('name, points_required')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .gte('points_required', customer.points)
      .order('points_required', { ascending: true })
      .limit(1)
      .single()

    // Obtener promoción si está configurada
    let promotion = null
    if (automation.promotion_id) {
      const { data: promoData } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', automation.promotion_id)
        .eq('is_active', true)
        .single()
      
      if (promoData) {
        promotion = promoData
      }
    }

    // Construir texto de recompensas
    let rewardText = '⭐ Revisa las recompensas disponibles'
    
    if (promotion) {
      rewardText = promotion.title
      if (promotion.description) {
        rewardText += ` - ${promotion.description}`
      }
      if (promotion.discount_percentage) {
        rewardText += ` (${promotion.discount_percentage}% descuento)`
      }
    } else if (nextReward) {
      const pointsNeeded = nextReward.points_required - customer.points
      rewardText = `🎯 Próxima recompensa: ${nextReward.name} (faltan ${pointsNeeded} puntos)`
    }

    // Enviar mensaje de WhatsApp
    const templateName = 'points_notification'
    const parameters = [
      customer.name || 'Cliente', // {{1}} nombre del cliente
      pointsAwarded.toString(),   // {{2}} puntos que acaba de sumar
      rewardText                  // {{3}} recompensas disponibles
    ]

    console.log(`📱 Enviando plantilla ${templateName} a ${customer.name} (${customerPhone})`)
    console.log(`📋 Parámetros:`, parameters)

    const result = await whatsapp.sendTemplateWithParameters(customerPhone, templateName, parameters)
    
    if (result && !result.error) {
      console.log(`✅ Notificación de puntos enviada exitosamente a ${customer.name}`)
      
      // Registrar en logs
      await supabase
        .from('automation_logs')
        .insert([{
          automation_id: automation.id,
          customer_id: customerId,
          message_sent: `Auto: Puntos ${pointsAwarded} - ${rewardText}`,
          status: 'sent'
        }])
    } else {
      console.log(`❌ Error enviando notificación de puntos:`, result?.message || 'Error desconocido')
      
      // Registrar error en logs
      await supabase
        .from('automation_logs')
        .insert([{
          automation_id: automation.id,
          customer_id: customerId,
          message_sent: `Auto: Error - ${result?.message || 'Unknown error'}`,
          status: 'failed'
        }])
    }

  } catch (error) {
    console.error('Error enviando notificación automática de puntos:', error)
  }
}