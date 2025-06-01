import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mailboxes, sentEmails, emailEvents } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const mailboxId = parseInt(params.id)

    // Get total sent emails
    const [{ sent }] = await db
      .select({
        sent: count()
      })
      .from(sentEmails)
      .where(eq(sentEmails.mailboxId, mailboxId))

    // Get total replies
    const [{ replies }] = await db
      .select({
        replies: count()
      })
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.type, 'reply'),
          eq(emailEvents.sentEmailId, mailboxId)
        )
      )

    // Get total received
    const [{ received }] = await db
      .select({
        received: count()
      })
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.type, 'received'),
          eq(emailEvents.sentEmailId, mailboxId)
        )
      )

    // Get total saved
    const [{ saved }] = await db
      .select({
        saved: count()
      })
      .from(sentEmails)
      .where(
        and(
          eq(sentEmails.mailboxId, mailboxId),
          eq(sentEmails.status, 'saved')
        )
      )

    // Calculate success rate
    const successRate = sent > 0 ? ((replies + received) / sent) * 100 : 0

    return NextResponse.json({
      sent,
      replies,
      received,
      saved,
      successRate: Math.round(successRate * 100) / 100 // Round to 2 decimal places
    })
  } catch (error) {
    console.error('Error fetching mailbox stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mailbox statistics' },
      { status: 500 }
    )
  }
} 