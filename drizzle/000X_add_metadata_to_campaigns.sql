-- Add metadata column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metadata jsonb; 