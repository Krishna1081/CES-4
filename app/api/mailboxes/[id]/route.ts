import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { mailboxes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getUserWithOrganization } from '@/lib/db/auth-queries'

// Validation schema for mailbox updates
const updateMailboxSchema = z.object({
  email: z.string().email(),
  provider: z.string(),
  authTokenEncrypted: z.string().optional(),
  status: z.enum(['active', 'warning', 'error']),
  dailyLimit: z.number().min(1).max(1000),
  warmUpStatus: z.enum(['active', 'inactive', 'completed']),
  imap: z.object({
    server: z.string(),
    port: z.number().min(1).max(65535),
    security: z.enum(['ssl', 'tls', 'none']),
    username: z.string()
  }),
  smtp: z.object({
    server: z.string(),
    port: z.number().min(1).max(65535),
    security: z.enum(['ssl', 'tls', 'none']),
    username: z.string(),
    requireAuth: z.boolean()
  })
})

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const mailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, parseInt(params.id)),
      columns: {
        id: true,
        emailAddress: true,
        provider: true,
        status: true,
        dailyLimit: true,
        warmUpStatus: true,
        organizationId: true,
        metadata: true
      }
    })

    if (!mailbox) {
      return NextResponse.json(
        { error: 'Mailbox not found' },
        { status: 404 }
      )
    }

    // Verify the mailbox belongs to the user's organization
    if (mailbox.organizationId !== userWithOrg.organization.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Parse metadata to get IMAP and SMTP settings
    const metadata = mailbox.metadata ? JSON.parse(mailbox.metadata) : {}
    const response = {
      ...mailbox,
      imap: metadata.imap || {
        server: '',
        port: 993,
        security: 'ssl',
        username: mailbox.emailAddress
      },
      smtp: metadata.smtp || {
        server: '',
        port: 465,
        security: 'ssl',
        username: mailbox.emailAddress,
        requireAuth: true
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching mailbox:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const body = await req.json()
    const validatedData = updateMailboxSchema.parse(body)

    // Get the current mailbox to preserve existing metadata
    const currentMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, parseInt(params.id)),
      columns: {
        metadata: true
      }
    })

    // Parse existing metadata and merge with new settings
    const existingMetadata = currentMailbox?.metadata ? JSON.parse(currentMailbox.metadata) : {}
    const updatedMetadata = {
      ...existingMetadata,
      imap: validatedData.imap,
      smtp: validatedData.smtp
    }

    const [updatedMailbox] = await db
      .update(mailboxes)
      .set({
        status: validatedData.status,
        dailyLimit: validatedData.dailyLimit,
        warmUpStatus: validatedData.warmUpStatus,
        updatedAt: new Date(),
        metadata: JSON.stringify(updatedMetadata)
      })
      .where(eq(mailboxes.id, parseInt(params.id)))
      .returning()

    if (!updatedMailbox) {
      return NextResponse.json(
        { error: 'Mailbox not found' },
        { status: 404 }
      )
    }

    // Parse metadata to include in response
    const metadata = updatedMailbox.metadata ? JSON.parse(updatedMailbox.metadata) : {}
    const response = {
      ...updatedMailbox,
      imap: metadata.imap || {
        server: '',
        port: 993,
        security: 'ssl',
        username: updatedMailbox.emailAddress
      },
      smtp: metadata.smtp || {
        server: '',
        port: 465,
        security: 'ssl',
        username: updatedMailbox.emailAddress,
        requireAuth: true
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating mailbox:', error)
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    // Get the mailbox to verify ownership
    const mailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, parseInt(params.id)),
      columns: {
        id: true,
        organizationId: true
      }
    })

    if (!mailbox) {
      return NextResponse.json(
        { error: 'Mailbox not found' },
        { status: 404 }
      )
    }

    // Verify the mailbox belongs to the user's organization
    if (mailbox.organizationId !== userWithOrg.organization.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the mailbox
    await db.delete(mailboxes)
      .where(eq(mailboxes.id, parseInt(params.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting mailbox:', error)
    return NextResponse.json(
      { error: 'Failed to delete mailbox' },
      { status: 500 }
    )
  }
} 