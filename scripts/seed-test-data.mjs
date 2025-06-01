// Change this:
import 'dotenv/config';
import { db } from '../lib/db';
import { mailboxes, sentEmails, emailEvents, users, organizations, contacts, sequenceSteps, sequences, campaigns, lists, contactListMemberships, teams, teamMembers, activityLogs, auditLogs, settings, warmupSettings, warmupInteractions, ActivityType } from '@/lib/db/schema';
import { hash } from 'bcrypt';
async function seedTestData() {
  try {
    // Clean up existing data
    await db.delete(emailEvents).execute()
    await db.delete(sentEmails).execute()
    await db.delete(mailboxes).execute()
    await db.delete(organizations).execute()
    await db.delete(users).execute()
    await db.delete(contacts).execute()
    await db.delete(sequenceSteps).execute()
    await db.delete(sequences).execute()
    await db.delete(campaigns).execute()
    await db.delete(lists).execute()
    await db.delete(contactListMemberships).execute()
    await db.delete(teamMembers).execute()
    await db.delete(teams).execute()
    await db.delete(activityLogs).execute()
    await db.delete(auditLogs).execute()
    await db.delete(settings).execute()
    await db.delete(warmupSettings).execute()
    await db.delete(warmupInteractions).execute()

    // Create test user
    const passwordHash = await hash('test-password', 10)
    const user = await db.insert(users).values({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      role: 'member',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning().execute()

    // Create test organization
    const organization = await db.insert(organizations).values({
      id: 1,
      name: 'Test Organization',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning().execute()

    // Create test team
    const team = await db.insert(teams).values({
      id: 1,
      name: 'Test Team',
      organizationId: organization[0].id,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning().execute()

    // Add user to team
    await db.insert(teamMembers).values({
      id: 1,
      userId: user[0].id,
      teamId: team[0].id,
      role: 'admin',
      joinedAt: new Date()
    }).execute()

    // Create activity logs
    await db.insert(activityLogs).values([
      {
        id: 1,
        teamId: team[0].id,
        userId: user[0].id,
        action: ActivityType.SIGN_UP,
        timestamp: new Date(),
        ipAddress: '127.0.0.1'
      },
      {
        id: 2,
        teamId: team[0].id,
        userId: user[0].id,
        action: ActivityType.CREATE_TEAM,
        timestamp: new Date(),
        ipAddress: '127.0.0.1'
      }
    ]).execute()

    // Create audit logs
    await db.insert(auditLogs).values([
      {
        id: 1,
        organizationId: organization[0].id,
        userId: user[0].id,
        entityType: 'user',
        entityId: user[0].id,
        action: 'create',
        changes: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'member'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
      },
      {
        id: 2,
        organizationId: organization[0].id,
        userId: user[0].id,
        entityType: 'organization',
        entityId: organization[0].id,
        action: 'create',
        changes: {
          name: 'Test Organization'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date()
      }
    ]).execute()

    // Create settings
    await db.insert(settings).values([
      {
        id: 1,
        organizationId: organization[0].id,
        category: 'notifications',
        key: 'email_notifications',
        value: {
          enabled: true,
          types: ['campaign_updates', 'delivery_reports', 'system_alerts']
        },
        isGlobal: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        userId: user[0].id,
        category: 'appearance',
        key: 'theme',
        value: {
          mode: 'light',
          accent: 'blue'
        },
        isGlobal: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]).execute()

    // Create test contacts
    const contact1 = await db.insert(contacts).values({
      id: 1,
      organizationId: organization[0].id,
      email: 'contact1@example.com',
      firstName: 'Contact',
      lastName: 'One',
      createdAt: new Date()
    }).returning().execute()

    const contact2 = await db.insert(contacts).values({
      id: 2,
      organizationId: organization[0].id,
      email: 'contact2@example.com',
      firstName: 'Contact',
      lastName: 'Two',
      createdAt: new Date()
    }).returning().execute()

    // Create test list
    const list = await db.insert(lists).values({
      id: 1,
      organizationId: organization[0].id,
      name: 'Test List',
      type: 'static',
      createdAt: new Date()
    }).returning().execute()

    // Create contact list memberships
    await db.insert(contactListMemberships).values([
      {
        contactId: contact1[0].id,
        listId: list[0].id,
        addedAt: new Date()
      },
      {
        contactId: contact2[0].id,
        listId: list[0].id,
        addedAt: new Date()
      }
    ]).execute()

    // Create test campaign
    const campaign = await db.insert(campaigns).values({
      id: 1,
      organizationId: organization[0].id,
      userId: user[0].id,
      name: 'Test Campaign',
      goal: 'Test goal',
      status: 'active',
      targetListId: list[0].id,
      createdAt: new Date()
    }).returning().execute()

    // Create test sequence
    const sequence = await db.insert(sequences).values({
      id: 1,
      campaignId: campaign[0].id,
      name: 'Test Sequence',
      createdAt: new Date()
    }).returning().execute()

    // Create test sequence step
    const sequenceStep = await db.insert(sequenceSteps).values({
      id: 1,
      sequenceId: sequence[0].id,
      stepOrder: 1,
      type: 'email',
      configuration: {
        subject: 'Test Email',
        body: 'Test content',
        tracking: {
          opens: true,
          clicks: true
        }
      }
    }).returning().execute()

    // Create test mailboxes
    const mailbox1 = await db.insert(mailboxes).values({
      id: 1,
      userId: user[0].id,
      organizationId: organization[0].id,
      emailAddress: 'test1@example.com',
      provider: 'Gmail',
      status: 'active',
      dailyLimit: 100,
      warmUpStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null
    }).returning().execute()

    const mailbox2 = await db.insert(mailboxes).values({
      id: 2,
      userId: user[0].id,
      organizationId: organization[0].id,
      emailAddress: 'test2@example.com',
      provider: 'Outlook',
      status: 'inactive',
      dailyLimit: 50,
      warmUpStatus: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: null
    }).returning().execute()

    // Create warmup settings for mailboxes
    await db.insert(warmupSettings).values([
      {
        id: 1,
        mailboxId: mailbox1[0].id,
        enabled: true,
        dailyLimit: 5,
        rampUpDays: 30,
        currentDailyVolume: 0,
        targetDailyVolume: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        mailboxId: mailbox2[0].id,
        enabled: false,
        dailyLimit: 3,
        rampUpDays: 45,
        currentDailyVolume: 0,
        targetDailyVolume: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]).execute()

    // Create warmup interactions for mailboxes
    await db.insert(warmupInteractions).values([
      {
        id: 1,
        mailboxId: mailbox1[0].id,
        sentAt: new Date(),
        recipientEmail: 'recipient1@example.com',
        type: 'open',
        status: 'success',
        responseAt: null,
        sentiment: null
      },
      {
        id: 2,
        mailboxId: mailbox2[0].id,
        sentAt: new Date(),
        recipientEmail: 'recipient2@example.com',
        type: 'reply',
        status: 'success',
        responseAt: new Date(),
        sentiment: 'positive'
      }
    ]).execute()

    // Create test sent emails
    const sentEmail1 = await db.insert(sentEmails).values({
      id: 1,
      stepId: sequenceStep[0].id,
      contactId: contact1[0].id,
      campaignId: campaign[0].id,
      mailboxId: mailbox1[0].id,
      sentAt: new Date(),
      subject: 'Test Email 1',
      body: 'Test content 1',
      status: 'sent',
      messageId: 'test-message-1',
      metadata: null
    }).returning().execute()

    const sentEmail2 = await db.insert(sentEmails).values({
      id: 2,
      stepId: sequenceStep[0].id,
      contactId: contact2[0].id,
      campaignId: campaign[0].id,
      mailboxId: mailbox1[0].id,
      sentAt: new Date(),
      subject: 'Test Email 2',
      body: 'Test content 2',
      status: 'sent',
      messageId: 'test-message-2',
      metadata: null
    }).returning().execute()

    // Create test email events
    await db.insert(emailEvents).values([
      {
        id: 1,
        sentEmailId: sentEmail1[0].id,
        contactId: contact1[0].id,
        type: 'reply',
        timestamp: new Date(),
        metadata: null
      },
      {
        id: 2,
        sentEmailId: sentEmail2[0].id,
        contactId: contact2[0].id,
        type: 'received',
        timestamp: new Date(),
        metadata: null
      }
    ]).execute()

    console.log('Test data seeded successfully!')
  } catch (error) {
    console.error('Error seeding test data:', error)
  }
}

seedTestData() 