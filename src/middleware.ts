import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/request'

export async function middleware(request: NextRequest) {
  // Simplificar el middleware para evitar problemas de autenticación en el servidor
  // La autenticación se manejará completamente en el cliente
  
  console.log(`Middleware: ${request.method} ${request.nextUrl.pathname}`)
  
  // Solo permitir que las requests pasen sin modificación
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
}