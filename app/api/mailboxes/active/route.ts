import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { mailboxes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getUserWithOrganization } from '@/lib/db/auth-queries'

export async function GET() {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization data
    const userWithOrg = await getUserWithOrganization(session.user.id)
    if (!userWithOrg?.organization?.id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch active mailboxes for the organization
    const activeMailboxes = await db
      .select({
        id: mailboxes.id,
        emailAddress: mailboxes.emailAddress,
        provider: mailboxes.provider,
        status: mailboxes.status,
        dailyLimit: mailboxes.dailyLimit
      })
      .from(mailboxes)
      .where(
        and(
          eq(mailboxes.organizationId, userWithOrg.organization.id),
          eq(mailboxes.status, 'active')
        )
      )
      .orderBy(mailboxes.emailAddress)

    return NextResponse.json(activeMailboxes)
  } catch (error) {
    console.error('Error fetching active mailboxes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active mailboxes' },
      { status: 500 }
    )
  }
} 