'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Por favor, completa todos los campos')
      return
    }

    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast.error('Error al iniciar sesión')
    } else {
      toast.success('¡Bienvenido!')
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 animate-fade-in">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            <span className="text-orange-500">LA BIRRITA</span>
            <span className="text-black"> BOT MANAGER</span>
          </CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sistema.com"
                disabled={loading}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full animate-scale-hover"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
          
          <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-2 text-center">Cuentas de Prueba</p>
            <div className="space-y-2">
              <div>
                <p className="font-medium text-xs text-blue-600">Administrador:</p>
                <p className="text-xs">Email: admin@labirrita.com</p>
                <p className="text-xs">Contraseña: admin123</p>
              </div>
              <div>
                <p className="font-medium text-xs text-green-600">Empleado:</p>
                <p className="text-xs">Email: maria@labirrita.com</p>
                <p className="text-xs">Contraseña: maria123</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}