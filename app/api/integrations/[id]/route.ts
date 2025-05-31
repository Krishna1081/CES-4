import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { integrations, organizations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

// Helper function to ensure default organization exists
async function ensureDefaultOrganization(): Promise<number> {
  try {
    const existingOrgs = await db.select().from(organizations).limit(1)
    
    if (existingOrgs.length > 0) {
      return existingOrgs[0].id
    }
    
    const [defaultOrg] = await db
      .insert(organizations)
      .values({
        name: 'Default Organization',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    
    return defaultOrg.id
  } catch (error) {
    console.error('Error ensuring default organization:', error)
    throw new Error('Failed to ensure default organization exists')
  }
}

// GET - Get specific integration details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await ensureDefaultOrganization()
    
    const integration = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, params.id)
        )
      )
      .limit(1)

    if (integration.length === 0) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(integration[0])
  } catch (error) {
    console.error('Error fetching integration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    )
  }
}

// PUT - Update integration configuration
const UpdateIntegrationSchema = z.object({
  status: z.enum(['active', 'inactive', 'error']).optional(),
  config: z.object({
    syncSettings: z.object({
      syncContacts: z.boolean().optional(),
      syncLeads: z.boolean().optional(),
      syncDirection: z.enum(['bidirectional', 'to_platform', 'to_crm']).optional(),
      autoSync: z.boolean().optional(),
      syncFrequency: z.enum(['realtime', 'hourly', 'daily']).optional(),
      filterByOwner: z.boolean().optional(),
      selectedOwners: z.array(z.string()).optional(),
      customFieldMapping: z.boolean().optional()
    }).optional()
  }).optional()
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = UpdateIntegrationSchema.parse(body)
    
    const organizationId = await ensureDefaultOrganization()

    // Check if integration exists
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, params.id)
        )
      )
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Merge existing config with updates
    const existingConfig = existing[0].config || {}
    const updatedConfig = validatedData.config 
      ? { ...existingConfig, ...validatedData.config }
      : existingConfig

    const [updated] = await db
      .update(integrations)
      .set({
        status: validatedData.status || existing[0].status,
        config: updatedConfig,
        lastSyncAt: new Date(),
      })
      .where(eq(integrations.id, existing[0].id))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating integration:', error)
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect integration
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await ensureDefaultOrganization()

    const deleted = await db
      .delete(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, params.id)
        )
      )
      .returning()

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Integration disconnected successfully' })
  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    )
  }
} 