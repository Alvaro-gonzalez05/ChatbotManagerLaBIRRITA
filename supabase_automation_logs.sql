-- Crear tabla para logs de automatizaciones
CREATE TABLE automation_execution_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_date TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL, -- 'daily', 'inactive', 'birthdays', 'vip-evaluation'
    status TEXT NOT NULL, -- 'started', 'completed', 'error'
    message TEXT,
    customers_processed INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    details JSONB, -- Detalles adicionales como errores específicos, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX idx_automation_logs_date ON automation_execution_logs(execution_date DESC);
CREATE INDEX idx_automation_logs_event ON automation_execution_logs(event_type);
CREATE INDEX idx_automation_logs_status ON automation_execution_logs(status);

-- RLS (Row Level Security) - opcional si quieres restricciones
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;