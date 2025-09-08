-- SQL para agregar las nuevas columnas al sistema de reservas con seña
-- Ejecutar en Supabase SQL Editor

-- Agregar las nuevas columnas a la tabla businesses
ALTER TABLE public.businesses 
ADD COLUMN instagram_url TEXT NULL,
ADD COLUMN location_url TEXT NULL,
ADD COLUMN transfer_alias TEXT NULL;

-- Agregar comentarios para documentar las nuevas columnas
COMMENT ON COLUMN public.businesses.instagram_url IS 'URL del perfil de Instagram del negocio';
COMMENT ON COLUMN public.businesses.location_url IS 'URL de Google Maps con la ubicación del negocio';
COMMENT ON COLUMN public.businesses.transfer_alias IS 'Alias de Mercado Pago o banco para recibir transferencias de señas';

-- Opcional: Agregar índices para mejorar performance si es necesario
-- CREATE INDEX idx_businesses_transfer_alias ON public.businesses(transfer_alias) WHERE transfer_alias IS NOT NULL;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
  AND column_name IN ('instagram_url', 'location_url', 'transfer_alias');
