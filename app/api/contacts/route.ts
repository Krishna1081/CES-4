import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { contacts, lists, contactListMemberships, organizations } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'

const createContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().optional(),
  customFields: z.record(z.any()).optional(),
})

const bulkImportSchema = z.object({
  contacts: z.array(createContactSchema),
  listId: z.number().optional(),
})

// Helper function to ensure default organization exists
async function ensureDefaultOrganization(): Promise<number> {
  try {
    // Check if any organization exists
    const existingOrgs = await db.select().from(organizations).limit(1)
    
    if (existingOrgs.length > 0) {
      return existingOrgs[0].id
    }
    
    // Create default organization if none exists
    const [defaultOrg] = await db
      .insert(organizations)
      .values({
        name: 'Default Organization',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    
    console.log('Created default organization:', defaultOrg.id)
    return defaultOrg.id
  } catch (error) {
    console.error('Error ensuring default organization:', error)
    throw new Error('Failed to ensure default organization exists')
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get('organizationId')
    const listId = searchParams.get('listId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use default organization if none specified
    let orgId: number
    if (organizationId) {
      orgId = parseInt(organizationId)
    } else {
      orgId = await ensureDefaultOrganization()
    }

    let query = db
      .select()
      .from(contacts)
      .where(eq(contacts.organizationId, orgId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contacts.createdAt))

    if (listId) {
      query = db
        .select({
          id: contacts.id,
          email: contacts.email,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          companyName: contacts.companyName,
          jobTitle: contacts.jobTitle,
          source: contacts.source,
          customFields: contacts.customFields,
          verificationStatus: contacts.verificationStatus,
          createdAt: contacts.createdAt,
        })
        .from(contacts)
        .innerJoin(
          contactListMemberships,
          eq(contacts.id, contactListMemberships.contactId)
        )
        .where(
          and(
            eq(contacts.organizationId, orgId),
            eq(contactListMemberships.listId, parseInt(listId))
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(contacts.createdAt))
    }

    const result = await query

    return NextResponse.json({
      contacts: result,
      pagination: {
        limit,
        offset,
        total: result.length, // In a real app, you'd get the actual total count
      },
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a bulk import or single contact creation
    if (body.contacts && Array.isArray(body.contacts)) {
      return handleBulkImport(body)
    } else {
      return handleSingleContactCreation(body)
    }
  } catch (error) {
    console.error('Error creating contact(s):', error)
    return NextResponse.json(
      { error: 'Failed to create contact(s)' },
      { status: 500 }
    )
  }
}

async function handleSingleContactCreation(body: any) {
  const validatedData = createContactSchema.parse(body)
  
  // Ensure default organization exists and get its ID
  const organizationId = await ensureDefaultOrganization()

  // Check if contact already exists
  const existingContact = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.email, validatedData.email),
        eq(contacts.organizationId, organizationId)
      )
    )
    .limit(1)

  if (existingContact.length > 0) {
    return NextResponse.json(
      { error: 'Contact with this email already exists' },
      { status: 409 }
    )
  }

  const [newContact] = await db
    .insert(contacts)
    .values({
      ...validatedData,
      organizationId,
      verificationStatus: 'pending',
    })
    .returning()

  return NextResponse.json({ contact: newContact }, { status: 201 })
}

async function handleBulkImport(body: any) {
  const validatedData = bulkImportSchema.parse(body)
  
  // Ensure default organization exists and get its ID
  const organizationId = await ensureDefaultOrganization()

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as Array<{ email: string; error: string }>,
  }

  // Process contacts in batches to avoid overwhelming the database
  const batchSize = 100
  for (let i = 0; i < validatedData.contacts.length; i += batchSize) {
    const batch = validatedData.contacts.slice(i, i + batchSize)

    for (const contactData of batch) {
      try {
        // Check if contact already exists
        const existingContact = await db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.email, contactData.email),
              eq(contacts.organizationId, organizationId)
            )
          )
          .limit(1)

        if (existingContact.length > 0) {
          results.skipped++
          continue
        }

        // Insert new contact
        const [newContact] = await db
          .insert(contacts)
          .values({
            ...contactData,
            organizationId,
            verificationStatus: 'pending',
          })
          .returning()

        // Add to list if specified
        if (validatedData.listId && newContact) {
          await db.insert(contactListMemberships).values({
            contactId: newContact.id,
            listId: validatedData.listId,
          })
        }

        results.imported++
      } catch (error) {
        results.errors.push({
          email: contactData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  return NextResponse.json({
    message: 'Bulk import completed',
    results,
  })
} 