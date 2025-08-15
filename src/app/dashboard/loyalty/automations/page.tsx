'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Zap } from 'lucide-react'

export default function AutomationsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir automáticamente después de 3 segundos
    const timer = setTimeout(() => {
      router.replace('/dashboard/loyalty')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">¡Funcionalidad Consolidada!</h2>
            <p className="text-muted-foreground">
              Las automatizaciones ahora se encuentran integradas en la página principal del Programa de Fidelidad.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Redirigiendo automáticamente...
            </p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full animate-pulse w-1/3"></div>
            </div>
          </div>

          <Button 
            onClick={() => router.replace('/dashboard/loyalty')} 
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al Programa de Fidelidad
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}