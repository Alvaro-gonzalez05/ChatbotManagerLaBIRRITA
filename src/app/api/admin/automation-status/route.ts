import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Usar cliente administrativo para consultas sin autenticación
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener estadísticas básicas de forma segura
    let totalCustomers = 0;
    let vipCustomers = 0;
    let birthdaysToday = 0;
    let inactiveCustomers = 0;

    try {
      const { count: total } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      totalCustomers = total || 0;
    } catch (error) {
      console.log('Error getting total customers:', error);
    }

    try {
      const { count: vip } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('vip_status', true);
      vipCustomers = vip || 0;
    } catch (error) {
      console.log('Error getting VIP customers:', error);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { count: birthdays } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('birthday', today);
      birthdaysToday = birthdays || 0;
    } catch (error) {
      console.log('Error getting birthdays:', error);
    }

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: inactive } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .lt('last_interaction', thirtyDaysAgo);
      inactiveCustomers = inactive || 0;
    } catch (error) {
      console.log('Error getting inactive customers:', error);
    }

    const automationStatus = {
      lastCheck: new Date().toISOString(),
      statistics: {
        totalCustomers,
        vipCustomers,
        birthdaysToday,
        inactiveCustomers
      },
      scheduledTasks: {
        daily: {
          schedule: "Diario 8:00 AM",
          nextExecution: getNextExecution(8, 0),
          endpoint: "/api/automation-events?event=daily",
          description: "Cumpleaños + Evaluación VIP"
        },
        inactive: {
          schedule: "Lunes 8:00 PM", 
          nextExecution: getNextMonday(20, 0),
          endpoint: "/api/automation-events?event=inactive",
          description: "Clientes Inactivos"
        }
      },
      systemStatus: "✅ Sistema Event-Driven Activo"
    };

    return NextResponse.json(automationStatus);

  } catch (error) {
    console.error('Error getting automation status:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getNextExecution(hour: number, minute: number): string {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.toISOString();
}

function getNextMonday(hour: number, minute: number): string {
  const now = new Date();
  const next = new Date();
  const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
  
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(hour, minute, 0, 0);
  
  if (daysUntilMonday === 0 && next <= now) {
    next.setDate(next.getDate() + 7);
  }
  
  return next.toISOString();
}
