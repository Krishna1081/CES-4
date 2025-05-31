import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  real,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  timezone: varchar('timezone', { length: 100 }).default('UTC'),
  lastLoginAt: timestamp('last_login_at'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: text('email_verification_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionPlanId: integer('subscription_plan_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  organizationId: integer('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const mailboxes = pgTable('mailboxes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  authTokenEncrypted: text('auth_token_encrypted').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  dailyLimit: integer('daily_limit').default(100),
  warmUpStatus: varchar('warm_up_status', { length: 50 }).default('inactive'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  domainName: varchar('domain_name', { length: 255 }).notNull(),
  spfValid: boolean('spf_valid'),
  dkimValid: boolean('dkim_valid'),
  dmarcPolicy: varchar('dmarc_policy', { length: 50 }),
  reputationScore: real('reputation_score'),
  lastCheckedAt: timestamp('last_checked_at'),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  companyName: varchar('company_name', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  customFields: jsonb('custom_fields'),
  source: varchar('source', { length: 100 }),
  verificationStatus: varchar('verification_status', { length: 50 }),
  verificationCheckedAt: timestamp('verification_checked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const lists = pgTable('lists', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  criteria: jsonb('criteria'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const contactListMemberships = pgTable('contact_list_memberships', {
  contactId: integer('contact_id')
    .notNull()
    .references(() => contacts.id),
  listId: integer('list_id')
    .notNull()
    .references(() => lists.id),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.contactId, table.listId] }),
  };
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  goal: text('goal'),
  status: varchar('status', { length: 50 }).notNull(),
  targetListId: integer('target_list_id').references(() => lists.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sequences = pgTable('sequences', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sequenceSteps = pgTable('sequence_steps', {
  id: serial('id').primaryKey(),
  sequenceId: integer('sequence_id')
    .notNull()
    .references(() => sequences.id),
  stepOrder: integer('step_order').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  configuration: jsonb('configuration').notNull(),
});

export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: varchar('name', { length: 255 }).notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const sentEmails = pgTable('sent_emails', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  stepId: integer('step_id')
    .notNull()
    .references(() => sequenceSteps.id),
  contactId: integer('contact_id')
    .notNull()
    .references(() => contacts.id),
  campaignId: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  mailboxId: integer('mailbox_id')
    .notNull()
    .references(() => mailboxes.id),
  sentAt: timestamp('sent_at').notNull(),
  subject: text('subject'),
  body: text('body'),
  messageId: varchar('message_id', { length: 255 }).unique(),
  status: varchar('status', { length: 50 }).notNull(),
  metadata: jsonb('metadata'),
});

export const emailEvents = pgTable('email_events', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  sentEmailId: bigint('sent_email_id', { mode: 'number' })
    .notNull()
    .references(() => sentEmails.id),
  contactId: integer('contact_id')
    .notNull()
    .references(() => contacts.id),
  type: varchar('type', { length: 50 }).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  metadata: jsonb('metadata'),
});

export const suppressionList = pgTable('suppression_list', {
  email: varchar('email', { length: 255 }).notNull(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  reason: varchar('reason', { length: 100 }).notNull(),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.email, table.organizationId] }),
  };
});

export const abTests = pgTable('ab_tests', {
  id: serial('id').primaryKey(),
  stepId: integer('step_id')
    .notNull()
    .references(() => sequenceSteps.id),
  variableTested: varchar('variable_tested', { length: 50 }).notNull(),
  variations: jsonb('variations').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  winnerVariationId: varchar('winner_variation_id', { length: 50 }),
  results: jsonb('results'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  contactId: integer('contact_id').references(() => contacts.id),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const warmupSettings = pgTable('warmup_settings', {
  id: serial('id').primaryKey(),
  mailboxId: integer('mailbox_id')
    .notNull()
    .references(() => mailboxes.id),
  enabled: boolean('enabled').notNull().default(false),
  dailyLimit: integer('daily_limit').notNull().default(5),
  rampUpDays: integer('ramp_up_days').notNull().default(30),
  currentDailyVolume: integer('current_daily_volume').notNull().default(0),
  targetDailyVolume: integer('target_daily_volume').notNull().default(50),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const warmupInteractions = pgTable('warmup_interactions', {
  id: serial('id').primaryKey(),
  mailboxId: integer('mailbox_id')
    .notNull()
    .references(() => mailboxes.id),
  sentAt: timestamp('sent_at').notNull(),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  responseAt: timestamp('response_at'),
  sentiment: varchar('sentiment', { length: 20 }),
});

export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  type: varchar('type', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  config: jsonb('config').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').references(() => organizations.id),
  userId: integer('user_id').references(() => users.id),
  category: varchar('category', { length: 100 }).notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value').notNull(),
  isGlobal: boolean('is_global').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .notNull()
    .references(() => organizations.id),
  userId: integer('user_id').references(() => users.id),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: integer('entity_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  changes: jsonb('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  mailboxes: many(mailboxes),
  campaigns: many(campaigns),
  tasks: many(tasks),
  settings: many(settings),
  auditLogs: many(auditLogs),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  teams: many(teams),
  mailboxes: many(mailboxes),
  domains: many(domains),
  contacts: many(contacts),
  lists: many(lists),
  campaigns: many(campaigns),
  emailTemplates: many(emailTemplates),
  suppressionList: many(suppressionList),
  tasks: many(tasks),
  integrations: many(integrations),
  settings: many(settings),
  auditLogs: many(auditLogs),
}));

export const teamsRelations = relations(teams, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
}));

export const mailboxesRelations = relations(mailboxes, ({ one, many }) => ({
  user: one(users, {
    fields: [mailboxes.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [mailboxes.organizationId],
    references: [organizations.id],
  }),
  sentEmails: many(sentEmails),
  warmupSettings: many(warmupSettings),
  warmupInteractions: many(warmupInteractions),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  contactListMemberships: many(contactListMemberships),
  sentEmails: many(sentEmails),
  emailEvents: many(emailEvents),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [lists.organizationId],
    references: [organizations.id],
  }),
  contactListMemberships: many(contactListMemberships),
  campaigns: many(campaigns),
}));

export const contactListMembershipsRelations = relations(contactListMemberships, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactListMemberships.contactId],
    references: [contacts.id],
  }),
  list: one(lists, {
    fields: [contactListMemberships.listId],
    references: [lists.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  targetList: one(lists, {
    fields: [campaigns.targetListId],
    references: [lists.id],
  }),
  sequences: many(sequences),
  sentEmails: many(sentEmails),
}));

export const sequencesRelations = relations(sequences, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [sequences.campaignId],
    references: [campaigns.id],
  }),
  sequenceSteps: many(sequenceSteps),
}));

export const sequenceStepsRelations = relations(sequenceSteps, ({ one, many }) => ({
  sequence: one(sequences, {
    fields: [sequenceSteps.sequenceId],
    references: [sequences.id],
  }),
  sentEmails: many(sentEmails),
  abTests: many(abTests),
}));

export const sentEmailsRelations = relations(sentEmails, ({ one, many }) => ({
  sequenceStep: one(sequenceSteps, {
    fields: [sentEmails.stepId],
    references: [sequenceSteps.id],
  }),
  contact: one(contacts, {
    fields: [sentEmails.contactId],
    references: [contacts.id],
  }),
  campaign: one(campaigns, {
    fields: [sentEmails.campaignId],
    references: [campaigns.id],
  }),
  mailbox: one(mailboxes, {
    fields: [sentEmails.mailboxId],
    references: [mailboxes.id],
  }),
  emailEvents: many(emailEvents),
}));

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  sentEmail: one(sentEmails, {
    fields: [emailEvents.sentEmailId],
    references: [sentEmails.id],
  }),
  contact: one(contacts, {
    fields: [emailEvents.contactId],
    references: [contacts.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const suppressionListRelations = relations(suppressionList, ({ one }) => ({
  organization: one(organizations, {
    fields: [suppressionList.organizationId],
    references: [organizations.id],
  }),
}));

export const abTestsRelations = relations(abTests, ({ one }) => ({
  sequenceStep: one(sequenceSteps, {
    fields: [abTests.stepId],
    references: [sequenceSteps.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [tasks.campaignId],
    references: [campaigns.id],
  }),
  contact: one(contacts, {
    fields: [tasks.contactId],
    references: [contacts.id],
  }),
}));

export const warmupSettingsRelations = relations(warmupSettings, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [warmupSettings.mailboxId],
    references: [mailboxes.id],
  }),
}));

export const warmupInteractionsRelations = relations(warmupInteractions, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [warmupInteractions.mailboxId],
    references: [mailboxes.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.organizationId],
    references: [organizations.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  organization: one(organizations, {
    fields: [settings.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [settings.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Mailbox = typeof mailboxes.$inferSelect;
export type NewMailbox = typeof mailboxes.$inferInsert;
export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;
export type ContactListMembership = typeof contactListMemberships.$inferSelect;
export type NewContactListMembership = typeof contactListMemberships.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type NewSequenceStep = typeof sequenceSteps.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type SentEmail = typeof sentEmails.$inferSelect;
export type NewSentEmail = typeof sentEmails.$inferInsert;
export type EmailEvent = typeof emailEvents.$inferSelect;
export type NewEmailEvent = typeof emailEvents.$inferInsert;
export type SuppressionListEntry = typeof suppressionList.$inferSelect;
export type NewSuppressionListEntry = typeof suppressionList.$inferInsert;
export type ABTest = typeof abTests.$inferSelect;
export type NewABTest = typeof abTests.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type WarmupSettings = typeof warmupSettings.$inferSelect;
export type NewWarmupSettings = typeof warmupSettings.$inferInsert;
export type WarmupInteraction = typeof warmupInteractions.$inferSelect;
export type NewWarmupInteraction = typeof warmupInteractions.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
