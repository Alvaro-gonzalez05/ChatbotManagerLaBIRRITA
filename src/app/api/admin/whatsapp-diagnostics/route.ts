import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppBusinessApiService } from '@/services/whatsappBusinessApi';

export async function GET() {
  try {
    const whatsapp = new WhatsAppBusinessApiService();
    
    // Información de diagnóstico (sin mostrar tokens completos por seguridad)
    const diagnostics = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'Configurado ✅' : 'No configurado ❌',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'No configurado ❌',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'Configurado ✅' : 'No configurado ❌',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v19.0',
      baseUrl: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}`,
      fullUrl: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
    };

    return NextResponse.json({
      status: 'WhatsApp API Configuration',
      diagnostics,
      recommendation: 'Verificar que todas las variables de entorno estén configuradas correctamente'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Error en diagnóstico de WhatsApp',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
