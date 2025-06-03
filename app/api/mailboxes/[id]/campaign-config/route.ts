import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { campaignConfigs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for campaign config
const campaignConfigSchema = z.object({
  maxDailyEmails: z.number().min(1).max(1000),
  enableSignature: z.boolean(),
  enableTracking: z.boolean(),
  replyToEmail: z.string().email().optional(),
  customDomain: z.string().optional(),
  bounceHandling: z.object({
    enabled: z.boolean(),
    maxBounces: z.number().min(1).max(100).optional(),
    action: z.enum(['pause', 'notify', 'none']).optional()
  }).optional(),
  spamProtection: z.object({
    enabled: z.boolean(),
    maxComplaints: z.number().min(1).max(100).optional(),
    action: z.enum(['pause', 'notify', 'none']).optional()
  }).optional()
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const mailboxId = parseInt(params.id)
    if (isNaN(mailboxId)) {
      return NextResponse.json(
        { error: 'Invalid mailbox ID' },
        { status: 400 }
      )
    }

    // Fetch campaign config
    const config = await db.query.campaignConfigs.findFirst({
      where: eq(campaignConfigs.mailboxId, mailboxId)
    })

    // If no config exists, return default values
    if (!config) {
      return NextResponse.json({
        maxDailyEmails: 100,
        enableSignature: true,
        enableTracking: true,
        replyToEmail: '',
        customDomain: '',
        bounceHandling: {
          enabled: true,
          maxBounces: 5,
          action: 'pause'
        },
        spamProtection: {
          enabled: true,
          maxComplaints: 3,
          action: 'pause'
        }
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching campaign config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign config' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const mailboxId = parseInt(params.id)
    if (isNaN(mailboxId)) {
      return NextResponse.json(
        { error: 'Invalid mailbox ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = campaignConfigSchema.parse(body)

    // Update or create campaign config
    const existingConfig = await db.query.campaignConfigs.findFirst({
      where: eq(campaignConfigs.mailboxId, mailboxId)
    })

    if (existingConfig) {
      await db
        .update(campaignConfigs)
        .set({
          maxDailyEmails: validatedData.maxDailyEmails,
          enableSignature: validatedData.enableSignature,
          enableTracking: validatedData.enableTracking,
          updatedAt: new Date()
        })
        .where(eq(campaignConfigs.mailboxId, mailboxId))
    } else {
      await db.insert(campaignConfigs).values({
        mailboxId,
        maxDailyEmails: validatedData.maxDailyEmails,
        enableSignature: validatedData.enableSignature,
        enableTracking: validatedData.enableTracking
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating campaign config:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update campaign config' },
      { status: 500 }
    )
  }
} 