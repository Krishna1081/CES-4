import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { mailboxes } from '@/lib/db/schema'
import { encrypt, decrypt } from '@/lib/encryption'
import { testImapConnection, testSmtpConnection } from '@/lib/email/verification'
import { getSession } from '@/lib/auth/session'
import { getUserWithOrganization } from '@/lib/db/auth-queries'
import { eq } from 'drizzle-orm'

// Validation schema for mailbox creation
const mailboxSchema = z.object({
  email: z.string().email(),
  provider: z.string(),
  authTokenEncrypted: z.string(),
  imap: z.object({
    server: z.string(),
    port: z.number(),
    security: z.enum(['none', 'ssl', 'tls']),
    username: z.string().optional()
  }),
  smtp: z.object({
    server: z.string(),
    port: z.number(),
    security: z.enum(['none', 'ssl', 'tls']),
    username: z.string().optional(),
    requireAuth: z.boolean()
  })
})

export async function GET() {
  try {
    // Get the current user session
    const session = await getSession()
    console.log('Session:', session) // Debug log

    if (!session?.user?.id) {
      console.log('No session or user ID found') // Debug log
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization data
    const userWithOrg = await getUserWithOrganization(session.user.id)
    console.log('User with org:', userWithOrg) // Debug log

    if (!userWithOrg?.organization?.id) {
      console.log('No organization found for user') // Debug log
      // Return empty array instead of error if no organization exists yet
      return NextResponse.json([])
    }

    try {
      // Fetch mailboxes for the user's organization
      const userMailboxes = await db.query.mailboxes.findMany({
        where: eq(mailboxes.organizationId, userWithOrg.organization.id),
        orderBy: (mailboxes, { desc }) => [desc(mailboxes.createdAt)]
      })

      console.log('Found mailboxes:', userMailboxes.length) // Debug log
      return NextResponse.json(userMailboxes)
    } catch (dbError) {
      console.error('Database error:', dbError) // Debug log
      return NextResponse.json(
        { error: 'Database error while fetching mailboxes' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in GET /api/mailboxes:', error) // Debug log
    return NextResponse.json(
      { error: 'Failed to fetch mailboxes' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
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

    // Parse request body with error handling
    let body
    try {
      body = await req.json()
    } catch (error) {
      console.error('JSON parse error:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate request data
    let validatedData
    try {
      validatedData = mailboxSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Check if mailbox already exists
    const existingMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.emailAddress, validatedData.email)
    })

    if (existingMailbox) {
      return NextResponse.json(
        { 
          error: `Mailbox with email ${validatedData.email} already exists`,
          code: 'DUPLICATE_MAILBOX'
        },
        { status: 409 } // 409 Conflict
      )
    }

    // Decrypt the password for testing connections
    const decryptedPassword = await decrypt(validatedData.authTokenEncrypted)

    // Test IMAP connection
    const imapTest = await testImapConnection({
      server: validatedData.imap.server,
      port: validatedData.imap.port,
      security: validatedData.imap.security,
      username: validatedData.imap.username || validatedData.email,
      password: decryptedPassword
    })

    if (!imapTest.success) {
      return NextResponse.json(
        { error: `IMAP connection failed: ${imapTest.error}` },
        { status: 400 }
      )
    }

    // Test SMTP connection
    const smtpTest = await testSmtpConnection({
      server: validatedData.smtp.server,
      port: validatedData.smtp.port,
      security: validatedData.smtp.security,
      username: validatedData.smtp.username || validatedData.email,
      password: decryptedPassword,
      requireAuth: validatedData.smtp.requireAuth
    })

    if (!smtpTest.success) {
      return NextResponse.json(
        { error: `SMTP connection failed: ${smtpTest.error}` },
        { status: 400 }
      )
    }

    // Create mailbox record with the encrypted password stored in metadata
    const [mailbox] = await db.insert(mailboxes).values({
      id: Math.floor(Math.random() * 1000000), // Generate a random ID
      userId: session.user.id,
      organizationId: userWithOrg.organization.id,
      emailAddress: validatedData.email,
      provider: validatedData.provider,
      status: 'active',
      dailyLimit: 100, // Default daily limit
      warmUpStatus: 'inactive',
      metadata: JSON.stringify({
        imap: validatedData.imap,
        smtp: validatedData.smtp,
        authTokenEncrypted: validatedData.authTokenEncrypted
      })
    }).returning()

    return NextResponse.json(mailbox)
  } catch (error) {
    console.error('Mailbox creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create mailbox' },
      { status: 500 }
    )
  }
} 