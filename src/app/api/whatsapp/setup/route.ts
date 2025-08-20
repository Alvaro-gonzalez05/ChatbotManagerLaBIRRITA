import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/services/whatsappService'
import { createClient } from '@/lib/supabase'

const whatsappService = new WhatsAppService()

// Setup WhatsApp Business API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, phoneNumberId } = body

    if (!businessId || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Business ID and Phone Number ID are required' },
        { status: 400 }
      )
    }

    console.log(`Setting up WhatsApp Business API for business ${businessId} with phone number ID ${phoneNumberId}`)

    try {
      // Verificar que el phone number ID es válido
      const businessProfile = await whatsappService.getBusinessProfile(phoneNumberId)
      console.log('Business profile retrieved:', businessProfile)

      // Intentar guardar configuración en la base de datos
      try {
        const supabase = createClient()
        const { error: dbError } = await supabase
          .from('whatsapp_configurations')
          .upsert({
            business_id: businessId,
            phone_number_id: phoneNumberId,
            phone_number: businessProfile.display_phone_number,
            verified_name: businessProfile.verified_name,
            status: 'connected',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (dbError) {
          console.warn('Error saving to database (table may not exist):', dbError)
          // Continue without database save for now
        }
      } catch (dbSaveError) {
        console.warn('Database save failed, continuing without it:', dbSaveError)
      }

      return NextResponse.json({
        success: true,
        businessId,
        phoneNumberId,
        phoneNumber: businessProfile.display_phone_number,
        verifiedName: businessProfile.verified_name,
        status: 'connected',
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook/whatsapp`,
        instructions: [
          '1. Tu número de WhatsApp Business está configurado',
          '2. El bot está listo para recibir mensajes',
          '3. Envía un mensaje desde cualquier número para probar',
          '4. Los mensajes se procesarán automáticamente'
        ]
      })

    } catch (whatsappError: any) {
      console.error('WhatsApp API error:', whatsappError)
      
      return NextResponse.json(
        { error: 'Failed to setup WhatsApp Business API', details: whatsappError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('WhatsApp setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Get WhatsApp configuration status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    try {
      // Intentar obtener configuración de la base de datos
      let config = null
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('whatsapp_configurations')
          .select('*')
          .eq('business_id', businessId)
          .single()

        if (!error) {
          config = data
        } else if (error.code !== 'PGRST116') {
          console.warn('Database error:', error)
        }
      } catch (dbError) {
        console.warn('Database access failed, using default config:', dbError)
      }

      // Si no hay configuración en la DB, usar la configuración por defecto del .env
      if (!config) {
        const defaultPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '793528520499781'
        
        try {
          const businessProfile = await whatsappService.getBusinessProfile(defaultPhoneNumberId)
          
          return NextResponse.json({
            success: true,
            connected: true,
            phoneNumberId: defaultPhoneNumberId,
            phoneNumber: businessProfile.display_phone_number,
            verifiedName: businessProfile.verified_name,
            status: 'connected'
          })
        } catch (apiError) {
          return NextResponse.json({
            success: false,
            connected: false,
            error: 'WhatsApp not configured for this business'
          })
        }
      }

      // Verificar si la configuración sigue siendo válida
      try {
        const businessProfile = await whatsappService.getBusinessProfile(config.phone_number_id)
        
        return NextResponse.json({
          success: true,
          connected: true,
          phoneNumberId: config.phone_number_id,
          phoneNumber: businessProfile.display_phone_number,
          verifiedName: businessProfile.verified_name,
          status: config.status
        })
      } catch (apiError) {
        // Si la API falla, marcar como desconectado (si la tabla existe)
        try {
          const supabase = createClient()
          await supabase
            .from('whatsapp_configurations')
            .update({ status: 'disconnected' })
            .eq('business_id', businessId)
        } catch (updateError) {
          console.warn('Could not update status in database:', updateError)
        }

        return NextResponse.json({
          success: false,
          connected: false,
          error: 'WhatsApp API access issue'
        })
      }

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        connected: false,
        error: 'Error checking WhatsApp configuration',
        details: error.message
      })
    }

  } catch (error: any) {
    console.error('WhatsApp status error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Delete WhatsApp configuration
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    try {
      // Eliminar configuración de la base de datos
      const supabase = createClient()
      const { error } = await supabase
        .from('whatsapp_configurations')
        .delete()
        .eq('business_id', businessId)

      if (error) {
        throw error
      }
      
      return NextResponse.json({
        success: true,
        message: `WhatsApp configuration for business ${businessId} deleted successfully`
      })

    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to delete WhatsApp configuration', details: error.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('WhatsApp delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}