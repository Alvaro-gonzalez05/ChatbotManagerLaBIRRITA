-- Create conversation_context table for bot memory
CREATE TABLE IF NOT EXISTS conversation_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone VARCHAR(20) NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    reservation_day VARCHAR(50),
    reservation_time VARCHAR(20),
    reservation_type VARCHAR(20), -- 'cena' or 'baile'
    reservation_people INTEGER,
    context_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
    UNIQUE(customer_phone, business_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_context_phone_business 
ON conversation_context(customer_phone, business_id);

-- Add index for cleanup of expired contexts
CREATE INDEX IF NOT EXISTS idx_conversation_context_expires 
ON conversation_context(expires_at);

-- Add RLS policies
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;

-- Policy for service role (bot) to manage all conversations
CREATE POLICY "Service role can manage conversation context" ON conversation_context
    FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE conversation_context IS 'Stores conversation context for bot memory (expires in 15 minutes)';

-- Create function to clean up expired contexts
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_contexts()
RETURNS void AS $$
BEGIN
    DELETE FROM conversation_context 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER update_conversation_context_updated_at 
    BEFORE UPDATE ON conversation_context 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();