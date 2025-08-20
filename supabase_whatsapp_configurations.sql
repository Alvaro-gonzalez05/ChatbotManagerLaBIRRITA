-- Create whatsapp_configurations table
CREATE TABLE IF NOT EXISTS whatsapp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    verified_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'connected',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id),
    UNIQUE(phone_number_id)
);

-- Add RLS policies
ALTER TABLE whatsapp_configurations ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to see their own business configurations
CREATE POLICY "Users can view their business WhatsApp configurations" ON whatsapp_configurations
    FOR SELECT USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Policy for authenticated users to insert their own business configurations
CREATE POLICY "Users can insert their business WhatsApp configurations" ON whatsapp_configurations
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Policy for authenticated users to update their own business configurations
CREATE POLICY "Users can update their business WhatsApp configurations" ON whatsapp_configurations
    FOR UPDATE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Policy for authenticated users to delete their own business configurations
CREATE POLICY "Users can delete their business WhatsApp configurations" ON whatsapp_configurations
    FOR DELETE USING (
        business_id IN (
            SELECT id FROM businesses 
            WHERE owner_id = auth.uid()
        )
    );

-- Add comment
COMMENT ON TABLE whatsapp_configurations IS 'Stores WhatsApp Business API configurations for each business';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_configurations_updated_at 
    BEFORE UPDATE ON whatsapp_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();