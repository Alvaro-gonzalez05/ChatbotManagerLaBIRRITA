-- Agregar campo para criterios VIP dinámicos a la tabla loyalty_settings
ALTER TABLE public.loyalty_settings 
ADD COLUMN vip_criteria jsonb DEFAULT '{
  "monthly_visits": 5,
  "monthly_spending": 25000,
  "total_visits": 10,
  "total_spending": 50000
}'::jsonb;
