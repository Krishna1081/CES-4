-- Create enums
CREATE TYPE mailbox_status AS ENUM ('active', 'warning', 'error', 'inactive');
CREATE TYPE warmup_status AS ENUM ('active', 'inactive', 'completed');
CREATE TYPE event_type AS ENUM ('reply', 'received');

-- Alter mailboxes table
ALTER TABLE mailboxes
  ALTER COLUMN id TYPE bigint,
  ALTER COLUMN status TYPE mailbox_status USING status::mailbox_status,
  ALTER COLUMN daily_limit TYPE bigint,
  ALTER COLUMN warm_up_status TYPE warmup_status USING warm_up_status::warmup_status,
  RENAME COLUMN warm_up_status TO warmup_status,
  ADD COLUMN updated_at timestamp DEFAULT now(),
  ADD COLUMN metadata text;

-- Create sent_emails table if not exists
CREATE TABLE IF NOT EXISTS sent_emails (
  id bigint PRIMARY KEY,
  mailbox_id bigint NOT NULL REFERENCES mailboxes(id),
  subject varchar(255) NOT NULL,
  to varchar(255) NOT NULL,
  content text NOT NULL,
  saved boolean NOT NULL DEFAULT false,
  sent_at timestamp NOT NULL DEFAULT now(),
  metadata text
);

-- Create email_events table if not exists
CREATE TABLE IF NOT EXISTS email_events (
  id bigint PRIMARY KEY,
  mailbox_id bigint NOT NULL REFERENCES mailboxes(id),
  sent_email_id bigint NOT NULL REFERENCES sent_emails(id),
  type event_type NOT NULL,
  timestamp timestamp NOT NULL DEFAULT now(),
  metadata text
); 