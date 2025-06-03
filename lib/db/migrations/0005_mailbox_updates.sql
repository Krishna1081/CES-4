-- Add new columns to mailboxes table if they don't exist
DO $$ 
BEGIN
    -- Add signature column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'signature') THEN
        ALTER TABLE mailboxes ADD COLUMN signature text;
    END IF;

    -- Add tracking_domain column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'tracking_domain') THEN
        ALTER TABLE mailboxes ADD COLUMN tracking_domain text;
    END IF;

    -- Add tracking_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'tracking_status') THEN
        ALTER TABLE mailboxes ADD COLUMN tracking_status tracking_status DEFAULT 'disabled';
    END IF;

    -- Add dns_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'dns_status') THEN
        ALTER TABLE mailboxes ADD COLUMN dns_status dns_status DEFAULT 'not_found';
    END IF;

    -- Add dns_records column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'dns_records') THEN
        ALTER TABLE mailboxes ADD COLUMN dns_records jsonb;
    END IF;

    -- Add last_smtp_used column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'last_smtp_used') THEN
        ALTER TABLE mailboxes ADD COLUMN last_smtp_used timestamp;
    END IF;

    -- Add last_imap_used column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'mailboxes' AND column_name = 'last_imap_used') THEN
        ALTER TABLE mailboxes ADD COLUMN last_imap_used timestamp;
    END IF;
END $$;

-- Create warmup_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS warmup_schedules (
    id serial PRIMARY KEY,
    mailbox_id bigint NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    enabled boolean NOT NULL DEFAULT false,
    days_of_week text[] NOT NULL DEFAULT '{}',
    start_time time NOT NULL,
    end_time time NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

-- Create campaign_configs table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaign_configs (
    id serial PRIMARY KEY,
    mailbox_id bigint NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    max_daily_emails integer NOT NULL DEFAULT 100,
    enable_signature boolean NOT NULL DEFAULT true,
    enable_tracking boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

-- Add indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mailboxes_dns_status') THEN
        CREATE INDEX idx_mailboxes_dns_status ON mailboxes(dns_status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mailboxes_tracking_status') THEN
        CREATE INDEX idx_mailboxes_tracking_status ON mailboxes(tracking_status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_warmup_schedules_mailbox_id') THEN
        CREATE INDEX idx_warmup_schedules_mailbox_id ON warmup_schedules(mailbox_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_campaign_configs_mailbox_id') THEN
        CREATE INDEX idx_campaign_configs_mailbox_id ON campaign_configs(mailbox_id);
    END IF;
END $$; 