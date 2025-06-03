import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { mailboxes, warmupSchedules, campaignConfigs } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getUserWithOrganization } from '@/lib/db/auth-queries'

// Validation schemas
const warmupConfigSchema = z.object({
  maxEmails: z.number().min(1).max(1000),
  maxReplies: z.number().min(1).max(1000),
  schedule: z.object({
    enabled: z.boolean(),
    daysOfWeek: z.array(z.string()),
    startTime: z.string(),
    endTime: z.string()
  })
})

const campaignConfigSchema = z.object({
  maxDailyEmails: z.number().min(1).max(1000),
  enableSignature: z.boolean(),
  enableTracking: z.boolean()
})

const trackingDomainSchema = z.object({
  domain: z.string().min(1)
})

const bulkActionSchema = z.object({
  mailboxIds: z.array(z.number()),
  action: z.enum(['warmup', 'campaign', 'tracking', 'delete']),
  config: z.union([
    warmupConfigSchema,
    campaignConfigSchema,
    trackingDomainSchema,
    z.object({}) // Empty object for delete action
  ])
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userWithOrg = await getUserWithOrganization(session.user.id)
    if (!userWithOrg?.organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { mailboxIds, action, config } = bulkActionSchema.parse(body)

    // Verify all mailboxes belong to the organization
    const orgMailboxes = await db.query.mailboxes.findMany({
      where: eq(mailboxes.organizationId, userWithOrg.organization.id),
      columns: { id: true, emailAddress: true }
    })

    const validMailboxIds = orgMailboxes.map(m => m.id)
    const invalidMailboxIds = mailboxIds.filter(id => !validMailboxIds.includes(id))

    if (invalidMailboxIds.length > 0) {
      return NextResponse.json(
        { error: 'Some mailboxes do not belong to your organization' },
        { status: 403 }
      )
    }

    const results = {
      success: true,
      summary: {
        total: mailboxIds.length,
        successful: 0,
        skipped: 0,
        failed: 0,
        details: {
          successful: [] as string[],
          skipped: [] as string[],
          failed: [] as string[]
        }
      }
    }

    switch (action) {
      case 'warmup': {
        const warmupConfig = warmupConfigSchema.parse(config)
        await Promise.all(mailboxIds.map(async (mailboxId) => {
          try {
            const mailbox = orgMailboxes.find(m => m.id === mailboxId)
            if (!mailbox) {
              results.summary.failed++
              results.summary.details.failed.push(`Mailbox ID ${mailboxId} not found`)
              return
            }

            await db.insert(warmupSchedules)
              .values({
                mailboxId,
                enabled: warmupConfig.schedule.enabled,
                daysOfWeek: warmupConfig.schedule.daysOfWeek,
                startTime: warmupConfig.schedule.startTime,
                endTime: warmupConfig.schedule.endTime
              })
              .onConflictDoUpdate({
                target: warmupSchedules.mailboxId,
                set: {
                  enabled: warmupConfig.schedule.enabled,
                  daysOfWeek: warmupConfig.schedule.daysOfWeek,
                  startTime: warmupConfig.schedule.startTime,
                  endTime: warmupConfig.schedule.endTime,
                  updatedAt: new Date()
                }
              })
            
            results.summary.successful++
            results.summary.details.successful.push(mailbox.emailAddress)
          } catch (error) {
            results.summary.failed++
            results.summary.details.failed.push(`Failed to process mailbox ID ${mailboxId}`)
          }
        }))
        break
      }

      case 'campaign': {
        const campaignConfig = campaignConfigSchema.parse(config)
        await Promise.all(mailboxIds.map(async (mailboxId) => {
          try {
            const mailbox = orgMailboxes.find(m => m.id === mailboxId)
            if (!mailbox) {
              results.summary.failed++
              results.summary.details.failed.push(`Mailbox ID ${mailboxId} not found`)
              return
            }

            await db.insert(campaignConfigs)
              .values({
                mailboxId,
                maxDailyEmails: campaignConfig.maxDailyEmails,
                enableSignature: campaignConfig.enableSignature,
                enableTracking: campaignConfig.enableTracking
              })
              .onConflictDoUpdate({
                target: campaignConfigs.mailboxId,
                set: {
                  maxDailyEmails: campaignConfig.maxDailyEmails,
                  enableSignature: campaignConfig.enableSignature,
                  enableTracking: campaignConfig.enableTracking,
                  updatedAt: new Date()
                }
              })
            
            results.summary.successful++
            results.summary.details.successful.push(mailbox.emailAddress)
          } catch (error) {
            results.summary.failed++
            results.summary.details.failed.push(`Failed to process mailbox ID ${mailboxId}`)
          }
        }))
        break
      }

      case 'tracking': {
        const trackingConfig = trackingDomainSchema.parse(config)
        await Promise.all(mailboxIds.map(async (mailboxId) => {
          try {
            const mailbox = orgMailboxes.find(m => m.id === mailboxId)
            if (!mailbox) {
              results.summary.failed++
              results.summary.details.failed.push(`Mailbox ID ${mailboxId} not found`)
              return
            }

            await db.update(mailboxes)
              .set({
                trackingDomain: trackingConfig.domain,
                trackingStatus: 'enabled',
                updatedAt: new Date()
              })
              .where(eq(mailboxes.id, mailboxId))
            
            results.summary.successful++
            results.summary.details.successful.push(mailbox.emailAddress)
          } catch (error) {
            results.summary.failed++
            results.summary.details.failed.push(`Failed to process mailbox ID ${mailboxId}`)
          }
        }))
        break
      }

      case 'delete': {
        await Promise.all(mailboxIds.map(async (mailboxId) => {
          try {
            const mailbox = orgMailboxes.find(m => m.id === mailboxId)
            if (!mailbox) {
              results.summary.failed++
              results.summary.details.failed.push(`Mailbox ID ${mailboxId} not found`)
              return
            }

            // Delete related records first
            await Promise.all([
              db.delete(warmupSchedules)
                .where(eq(warmupSchedules.mailboxId, mailboxId)),
              db.delete(campaignConfigs)
                .where(eq(campaignConfigs.mailboxId, mailboxId))
            ])
            
            // Then delete the mailbox
            await db.delete(mailboxes)
              .where(eq(mailboxes.id, mailboxId))
            
            results.summary.successful++
            results.summary.details.successful.push(mailbox.emailAddress)
          } catch (error) {
            results.summary.failed++
            results.summary.details.failed.push(`Failed to delete mailbox ID ${mailboxId}`)
          }
        }))
        break
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error performing bulk action:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 