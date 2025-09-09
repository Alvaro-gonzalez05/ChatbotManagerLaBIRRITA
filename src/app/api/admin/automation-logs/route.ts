import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('event_type');
    const status = searchParams.get('status');

    let query = supabase
      .from('automation_execution_logs')
      .select('*')
      .order('execution_date', { ascending: false })
      .limit(limit);

    // Filtros opcionales
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Estadísticas resumidas
    const { data: stats } = await supabase
      .from('automation_execution_logs')
      .select(`
        event_type,
        status,
        execution_date
      `)
      .gte('execution_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Agrupar estadísticas
    const statsGrouped = stats?.reduce((acc: any, log: any) => {
      const key = log.event_type;
      if (!acc[key]) {
        acc[key] = { total: 0, success: 0, errors: 0, lastExecution: null };
      }
      acc[key].total++;
      if (log.status === 'completed') acc[key].success++;
      if (log.status === 'error') acc[key].errors++;
      if (!acc[key].lastExecution || log.execution_date > acc[key].lastExecution) {
        acc[key].lastExecution = log.execution_date;
      }
      return acc;
    }, {});

    return NextResponse.json({
      logs: logs || [],
      totalLogs: logs?.length || 0,
      statistics: statsGrouped || {},
      filters: {
        limit,
        eventType: eventType || 'all',
        status: status || 'all'
      },
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}