import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { 
  campaigns, 
  sentEmails, 
  emailEvents, 
  mailboxes,
  contacts,
  organizations 
} from '@/lib/db/schema'
import { eq, and, gte, lte, sql, count, avg } from 'drizzle-orm'
import { format, parseISO, subDays } from 'date-fns'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const campaignId = searchParams.get('campaignId')
    const mailboxId = searchParams.get('mailboxId')

    // Default to last 7 days if no dates provided
    const from = fromDate ? parseISO(fromDate) : subDays(new Date(), 7)
    const to = toDate ? parseISO(toDate) : new Date()

    // Build base query conditions
    const conditions = [
      gte(sentEmails.sentAt, from),
      lte(sentEmails.sentAt, to)
    ]

    if (campaignId) {
      conditions.push(eq(sentEmails.campaignId, parseInt(campaignId)))
    }

    if (mailboxId) {
      conditions.push(eq(sentEmails.mailboxId, parseInt(mailboxId)))
    }

    // Calculate overview metrics
    const overviewMetrics = await db
      .select({
        totalSent: count(),
        totalOpened: count(
          sql`CASE WHEN ${emailEvents.type} = 'open' THEN 1 END`
        ),
        totalClicked: count(
          sql`CASE WHEN ${emailEvents.type} = 'click' THEN 1 END`
        ),
        totalReplied: count(
          sql`CASE WHEN ${emailEvents.type} = 'reply' THEN 1 END`
        ),
      })
      .from(sentEmails)
      .leftJoin(
        emailEvents,
        eq(emailEvents.sentEmailId, sentEmails.id)
      )
      .where(and(...conditions))

    const overview = {
      totalSent: Number(overviewMetrics[0]?.totalSent || 0),
      totalOpened: Number(overviewMetrics[0]?.totalOpened || 0),
      totalClicked: Number(overviewMetrics[0]?.totalClicked || 0),
      totalReplied: Number(overviewMetrics[0]?.totalReplied || 0),
      openRate: overviewMetrics[0]?.totalSent ? 
        Number(overviewMetrics[0].totalOpened) / Number(overviewMetrics[0].totalSent) : 0,
      clickRate: overviewMetrics[0]?.totalSent ? 
        Number(overviewMetrics[0].totalClicked) / Number(overviewMetrics[0].totalSent) : 0,
      replyRate: overviewMetrics[0]?.totalSent ? 
        Number(overviewMetrics[0].totalReplied) / Number(overviewMetrics[0].totalSent) : 0,
      unsubscribeRate: 0 // TODO: Implement unsubscribe tracking
    }

    // Fetch campaigns with their metrics
    const campaignQuery = db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        createdAt: campaigns.createdAt,
        totalSent: count(sentEmails.id),
        opened: count(
          sql`CASE WHEN ${emailEvents.type} = 'open' THEN 1 END`
        ),
        clicked: count(
          sql`CASE WHEN ${emailEvents.type} = 'click' THEN 1 END`
        ),
        replied: count(
          sql`CASE WHEN ${emailEvents.type} = 'reply' THEN 1 END`
        ),
      })
      .from(campaigns)
      .leftJoin(
        sentEmails,
        and(
          eq(sentEmails.campaignId, campaigns.id),
          gte(sentEmails.sentAt, from),
          lte(sentEmails.sentAt, to)
        )
      )
      .leftJoin(
        emailEvents,
        eq(emailEvents.sentEmailId, sentEmails.id)
      )
      .where(
        campaignId ? eq(campaigns.id, parseInt(campaignId)) : undefined
      )
      .groupBy(campaigns.id)

    const campaignData = await campaignQuery

    const campaignsWithMetrics = campaignData.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      totalSent: Number(campaign.totalSent || 0),
      opened: Number(campaign.opened || 0),
      clicked: Number(campaign.clicked || 0),
      replied: Number(campaign.replied || 0),
      openRate: campaign.totalSent ? Number(campaign.opened) / Number(campaign.totalSent) : 0,
      clickRate: campaign.totalSent ? Number(campaign.clicked) / Number(campaign.totalSent) : 0,
      replyRate: campaign.totalSent ? Number(campaign.replied) / Number(campaign.totalSent) : 0,
      lastActivity: format(new Date(campaign.createdAt), 'MMM dd, yyyy')
    }))

    // Generate chart data
    const chartData = await generateChartData(from, to, conditions)

    // Fetch mailboxes with their metrics
    const mailboxQuery = db
      .select({
        id: mailboxes.id,
        emailAddress: mailboxes.emailAddress,
        totalSent: count(),
        delivered: count(
          sql`CASE WHEN ${emailEvents.type} = 'delivered' THEN 1 END`
        ),
      })
      .from(mailboxes)
      .leftJoin(
        sentEmails,
        eq(sentEmails.mailboxId, mailboxes.id)
      )
      .leftJoin(
        emailEvents,
        eq(emailEvents.sentEmailId, sentEmails.id)
      )
      .where(
        mailboxId ? eq(mailboxes.id, parseInt(mailboxId)) : undefined
      )
      .groupBy(mailboxes.id)

    const mailboxData = await mailboxQuery

    const mailboxesWithMetrics = mailboxData.map(mailbox => ({
      id: mailbox.id,
      emailAddress: mailbox.emailAddress,
      totalSent: Number(mailbox.totalSent || 0),
      deliveryRate: mailbox.totalSent ? 
        Number(mailbox.delivered) / Number(mailbox.totalSent) : 0
    }))

    return NextResponse.json({
      overview,
      campaigns: campaignsWithMetrics || [],
      chartData,
      mailboxes: mailboxesWithMetrics || []
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

async function generateChartData(from: Date, to: Date, conditions: any[]) {
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  const data = []

  for (let i = 0; i <= days; i++) {
    const date = new Date(from)
    date.setDate(date.getDate() + i)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayConditions = [
      ...conditions,
      gte(sentEmails.sentAt, date),
      lte(sentEmails.sentAt, nextDate)
    ]

    const metrics = await db
      .select({
        totalSent: count(),
        opened: count(
          sql`CASE WHEN ${emailEvents.type} = 'open' THEN 1 END`
        ),
        replied: count(
          sql`CASE WHEN ${emailEvents.type} = 'reply' THEN 1 END`
        ),
      })
      .from(sentEmails)
      .leftJoin(
        emailEvents,
        eq(emailEvents.sentEmailId, sentEmails.id)
      )
      .where(and(...dayConditions))

    const dayData = metrics[0]
    const totalSent = Number(dayData.totalSent)
    const opened = Number(dayData.opened)
    const replied = Number(dayData.replied)

    data.push({
      date: format(date, 'yyyy-MM-dd'),
      openRate: totalSent ? opened / totalSent : 0,
      replyRate: totalSent ? replied / totalSent : 0,
      count: totalSent
    })
  }

  return {
    openRates: data.map(d => ({ date: d.date, rate: d.openRate })),
    replyRates: data.map(d => ({ date: d.date, rate: d.replyRate })),
    sentEmails: data.map(d => ({ date: d.date, count: d.count }))
  }
} 