import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const { 
      customerPhone, 
      customerName, 
      pointsAdded, 
      totalPoints, 
      businessId, 
      automationId,
      templateName 
    } = await request.json()

    // Buscar la próxima recompensa disponible
    const { data: nextRewardData } = await supabase
      .from('redeemable_items')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .gte('points_required', totalPoints)
      .order('points_required', { ascending: true })
      .limit(1)

    const nextReward = nextRewardData?.[0]

    // Construir mensaje usando plantilla
    let message = `¡Hola ${customerName}! Cargaste ${pointsAdded} puntos 🎯`
    
    if (nextReward) {
      message += `\n\nPodés canjearlos por:\n• ${nextReward.name} (${nextReward.points_required} pts)`
      if (totalPoints >= nextReward.points_required) {
        message += ' ✅ ¡Ya podés canjearlo!'
      } else {
        const pointsNeeded = nextReward.points_required - totalPoints
        message += `\n• Te faltan ${pointsNeeded} pts más`
      }
    } else {
      message += `\n\n¡Seguí sumando puntos para desbloquear recompensas!`
    }

    message += '\n\n¡Disfrutá tus recompensas! 🍺'

    // Enviar plantilla de WhatsApp
    const whatsapp = new WhatsAppBusinessApiService()
    const metaTemplateName = 'points_notification'
    
    // Template expects only 3 parameters: nombre, puntos sumados, recompensas disponibles
    const rewardInfo = nextReward && nextReward.name && nextReward.points_required !== undefined
      ? `${nextReward.name} (faltan ${nextReward.points_required - totalPoints} puntos)`
      : 'Consulta las recompensas disponibles'
    
    const parameters = [
      customerName, // {{1}} - nombre del cliente
      pointsAdded.toString(), // {{2}} - puntos sumados  
      rewardInfo // {{3}} - recompensas disponibles (combined reward name and points needed)
    ]

    const result = await whatsapp.sendTemplateWithParameters(customerPhone, metaTemplateName, parameters)

    if (result) {
      // Log de automatización
      await supabase
        .from('automation_logs')
        .insert([{
          automation_id: automationId,
          customer_id: null, // Podríamos agregar customer_id si lo tenemos
          trigger_type: 'points_notification',
          status: 'sent',
          message_content: message,
          sent_at: new Date().toISOString(),
          metadata: {
            customer_phone: customerPhone,
            points_added: pointsAdded,
            total_points: totalPoints,
            template_name: templateName
          }
        }])

      return NextResponse.json({
        success: true,
        message: 'Notificación enviada correctamente',
        sent_to: customerPhone
      })
    } else {
      throw new Error('Error enviando mensaje de WhatsApp')
    }

  } catch (error: any) {
    console.error('Error enviando notificación de puntos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error enviando notificación',
      details: error.message
    }, { status: 500 })
  }
}