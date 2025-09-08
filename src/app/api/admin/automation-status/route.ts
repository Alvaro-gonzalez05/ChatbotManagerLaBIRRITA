import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();

    // Obtener estadísticas generales
    const [
      { count: totalCustomers },
      { count: vipCustomers },
      { count: birthdaysToday },
      { count: inactiveCustomers }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('vip_status', true),
      supabase.from('customers').select('*', { count: 'exact', head: true })
        .eq('birthday', new Date().toISOString().split('T')[0]),
      supabase.from('customers').select('*', { count: 'exact', head: true })
        .lt('last_visit', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    // Obtener últimas ejecuciones de automatizaciones (si tienes una tabla de logs)
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10);

    const automationStatus = {
      lastCheck: new Date().toISOString(),
      statistics: {
        totalCustomers: totalCustomers || 0,
        vipCustomers: vipCustomers || 0,
        birthdaysToday: birthdaysToday || 0,
        inactiveCustomers: inactiveCustomers || 0
      },
      scheduledTasks: {
        birthdays: {
          schedule: "Diario 8:00 AM",
          nextExecution: getNextExecution(8, 0),
          endpoint: "/api/automation-events?event=birthdays"
        },
        inactive: {
          schedule: "Lunes 8:00 PM", 
          nextExecution: getNextMonday(20, 0),
          endpoint: "/api/automation-events?event=inactive"
        },
        vipEvaluation: {
          schedule: "Diario 2:00 AM",
          nextExecution: getNextExecution(2, 0),
          endpoint: "/api/cron/vip-evaluation"
        }
      },
      recentActivity: recentMessages?.slice(0, 5) || []
    };

    return NextResponse.json(automationStatus);

  } catch (error) {
    console.error('Error getting automation status:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
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
