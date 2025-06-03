import { NextResponse } from "next/server";
import { db } from '@/lib/db'
import { warmupSettings, warmupSchedules, mailboxes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the user's primary mailbox
    const mailbox = (await db.select().from(mailboxes).where(eq(mailboxes.userId, Number(session.user.id))))[0]

    if (!mailbox) {
      return new NextResponse('No mailbox found', { status: 404 })
    }

    const settings = await db.query.warmupSettings.findFirst({
      where: eq(warmupSettings.mailboxId, mailbox.id)
    })

    const schedule = await db.query.warmupSchedules.findFirst({
      where: eq(warmupSchedules.mailboxId, mailbox.id)
    })

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

    return NextResponse.json({
      ...settings,
      schedule: schedule ?? {
        enabled: false,
        daysOfWeek: [],
        startTime: '09:00',
        endTime: '17:00'
      }
    })
  } catch (error) {
    console.error('Error fetching warmup settings:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the user's primary mailbox
    const mailbox = (await db.select().from(mailboxes).where(eq(mailboxes.userId, Number(session.user.id))))[0]

    if (!mailbox) {
      return new NextResponse('No mailbox found', { status: 404 })
    }

    const body = await req.json()
    const { enabled, dailyLimit, rampUpDays, targetDailyVolume, schedule } = body

    const existingSettings = await db.query.warmupSettings.findFirst({
      where: eq(warmupSettings.mailboxId, mailbox.id)
    })

    if (existingSettings) {
      await db
        .update(warmupSettings)
        .set({
          enabled,
          dailyLimit,
          rampUpDays,
          targetDailyVolume,
          updatedAt: new Date()
        })
        .where(eq(warmupSettings.mailboxId, mailbox.id))

      // Update or create schedule
      const existingSchedule = await db.query.warmupSchedules.findFirst({
        where: eq(warmupSchedules.mailboxId, mailbox.id)
      })

      if (existingSchedule) {
        await db
          .update(warmupSchedules)
          .set({
            enabled: schedule.enabled,
            daysOfWeek: schedule.daysOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            updatedAt: new Date()
          })
          .where(eq(warmupSchedules.mailboxId, mailbox.id))
      } else {
        await db.insert(warmupSchedules).values({
          mailboxId: mailbox.id,
          enabled: schedule.enabled,
          daysOfWeek: schedule.daysOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        })
      }
    } else {
      // Create new settings and schedule
      await db.insert(warmupSettings).values({
        mailboxId: mailbox.id,
        enabled,
        dailyLimit,
        rampUpDays,
        targetDailyVolume,
        currentDailyVolume: 0
      })

      await db.insert(warmupSchedules).values({
        mailboxId: mailbox.id,
        enabled: schedule.enabled,
        daysOfWeek: schedule.daysOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving warmup settings:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
 