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
import { eq, and, gte, lte, sql, count } from 'drizzle-orm'
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

    // Fetch detailed email data for export
    const emailData = await db
      .select({
        sentAt: sentEmails.sentAt,
        campaignName: campaigns.name,
        mailboxEmail: mailboxes.emailAddress,
        contactEmail: contacts.email,
        subject: sentEmails.subject,
        status: sentEmails.status,
        opened: sql<boolean>`EXISTS (
          SELECT 1 FROM ${emailEvents}
          WHERE ${emailEvents.sentEmailId} = ${sentEmails.id}
          AND ${emailEvents.type} = 'open'
        )`,
        clicked: sql<boolean>`EXISTS (
          SELECT 1 FROM ${emailEvents}
          WHERE ${emailEvents.sentEmailId} = ${sentEmails.id}
          AND ${emailEvents.type} = 'click'
        )`,
        replied: sql<boolean>`EXISTS (
          SELECT 1 FROM ${emailEvents}
          WHERE ${emailEvents.sentEmailId} = ${sentEmails.id}
          AND ${emailEvents.type} = 'reply'
        )`,
      })
      .from(sentEmails)
      .leftJoin(campaigns, eq(sentEmails.campaignId, campaigns.id))
      .leftJoin(mailboxes, eq(sentEmails.mailboxId, mailboxes.id))
      .leftJoin(contacts, eq(sentEmails.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(sentEmails.sentAt)

    // Convert to CSV
    const csvHeaders = [
      'Date',
      'Campaign',
      'Mailbox',
      'Recipient',
      'Subject',
      'Status',
      'Opened',
      'Clicked',
      'Replied'
    ]

    const rows = emailData.map(email => [
      format(new Date(email.sentAt), 'yyyy-MM-dd HH:mm:ss'),
      email.campaignName,
      email.mailboxEmail,
      email.contactEmail,
      email.subject,
      email.status,
      email.opened ? 'Yes' : 'No',
      email.clicked ? 'Yes' : 'No',
      email.replied ? 'Yes' : 'No'
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Set response headers for CSV download
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', 'text/csv')
    responseHeaders.set('Content-Disposition', `attachment; filename="analytics-export-${format(new Date(), 'yyyy-MM-dd')}.csv"`)

    return new NextResponse(csvContent, {
      status: 200,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Analytics export error:', error)
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    )
  }
} 