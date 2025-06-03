import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { warmupSettings, warmupSchedules } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for warmup settings
const warmupSettingsSchema = z.object({
  enabled: z.boolean(),
  dailyLimit: z.number().min(1).max(20),
  rampUpDays: z.number().min(7).max(90),
  targetDailyVolume: z.number().min(20).max(200),
  schedule: z.object({
    enabled: z.boolean(),
    daysOfWeek: z.array(z.string()),
    startTime: z.string(),
    endTime: z.string()
  })
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

    // Fetch warmup settings
    const settings = await db.query.warmupSettings.findFirst({
      where: eq(warmupSettings.mailboxId, mailboxId)
    })

    // Fetch warmup schedule
    const schedule = await db.query.warmupSchedules.findFirst({
      where: eq(warmupSchedules.mailboxId, mailboxId)
    })

    // If no settings exist, return default values
    if (!settings) {
      return NextResponse.json({
        enabled: false,
        dailyLimit: 5,
        rampUpDays: 30,
        targetDailyVolume: 50,
        schedule: {
          enabled: false,
          daysOfWeek: [],
          startTime: '09:00',
          endTime: '17:00'
        }
      })
    }

    // Combine settings and schedule
    return NextResponse.json({
      enabled: settings.enabled,
      dailyLimit: settings.dailyLimit,
      rampUpDays: settings.rampUpDays,
      targetDailyVolume: settings.targetDailyVolume,
      schedule: schedule ? {
        enabled: schedule.enabled,
        daysOfWeek: schedule.daysOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      } : {
        enabled: false,
        daysOfWeek: [],
        startTime: '09:00',
        endTime: '17:00'
      }
    })
  } catch (error) {
    console.error('Error fetching warmup settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warmup settings' },
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
    const validatedData = warmupSettingsSchema.parse(body)

    // Update or create warmup settings
    await db.transaction(async (tx) => {
      // Update warmup settings
      const existingSettings = await tx.query.warmupSettings.findFirst({
        where: eq(warmupSettings.mailboxId, mailboxId)
      })

      if (existingSettings) {
        await tx
          .update(warmupSettings)
          .set({
            enabled: validatedData.enabled,
            dailyLimit: validatedData.dailyLimit,
            rampUpDays: validatedData.rampUpDays,
            targetDailyVolume: validatedData.targetDailyVolume,
            updatedAt: new Date()
          })
          .where(eq(warmupSettings.mailboxId, mailboxId))
      } else {
        await tx.insert(warmupSettings).values({
          mailboxId,
          enabled: validatedData.enabled,
          dailyLimit: validatedData.dailyLimit,
          rampUpDays: validatedData.rampUpDays,
          targetDailyVolume: validatedData.targetDailyVolume
        })
      }

      // Update warmup schedule
      const existingSchedule = await tx.query.warmupSchedules.findFirst({
        where: eq(warmupSchedules.mailboxId, mailboxId)
      })

      if (existingSchedule) {
        await tx
          .update(warmupSchedules)
          .set({
            enabled: validatedData.schedule.enabled,
            daysOfWeek: validatedData.schedule.daysOfWeek,
            startTime: validatedData.schedule.startTime,
            endTime: validatedData.schedule.endTime,
            updatedAt: new Date()
          })
          .where(eq(warmupSchedules.mailboxId, mailboxId))
      } else {
        await tx.insert(warmupSchedules).values({
          mailboxId,
          enabled: validatedData.schedule.enabled,
          daysOfWeek: validatedData.schedule.daysOfWeek,
          startTime: validatedData.schedule.startTime,
          endTime: validatedData.schedule.endTime
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating warmup settings:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update warmup settings' },
      { status: 500 }
    )
  }
} 