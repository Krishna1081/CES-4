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

// Available integrations configuration
const availableIntegrations = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    type: 'crm',
    description: 'Sync contacts, deals, and companies with HubSpot CRM',
    logo: '🟠',
    features: ['Contact Sync', 'Deal Sync', 'Company Sync', 'Custom Properties'],
    isPopular: true,
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    requiredScopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.owners.read', 'oauth']
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    type: 'crm',
    description: 'Connect with Salesforce to sync leads and opportunities',
    logo: '⚡',
    features: ['Lead Sync', 'Opportunity Sync', 'Account Sync', 'Custom Fields'],
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    requiredScopes: ['api', 'refresh_token']
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    type: 'crm',
    description: 'Sync your Pipedrive contacts and deals',
    logo: '🔴',
    features: ['Person Sync', 'Deal Sync', 'Organization Sync'],
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    requiredScopes: ['deals:read', 'persons:read', 'organizations:read']
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    type: 'crm',
    description: 'Import contacts and leads from Zoho CRM',
    logo: '🔵',
    features: ['Contact Sync', 'Lead Sync', 'Account Sync'],
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    requiredScopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.settings.ALL']
  }
]

// GET - List all integrations with their connection status
export async function GET() {
  try {
    const organizationId = await ensureDefaultOrganization()
    
    // Get connected integrations from database
    const connectedIntegrations = await db
      .select()
      .from(integrations)
      .where(eq(integrations.organizationId, organizationId))

    // Merge with available integrations to show status
    const integrationsWithStatus = availableIntegrations.map(available => {
      const connected = connectedIntegrations.find(c => c.type === available.id)
      
      return {
        ...available,
        status: connected ? connected.status : 'disconnected',
        lastSync: connected?.lastSyncAt || null,
        connectedAt: connected?.createdAt || null,
        config: connected?.config || null
      }
    })

    return NextResponse.json(integrationsWithStatus)
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

// POST - Create/update integration connection
const CreateIntegrationSchema = z.object({
  type: z.string(),
  name: z.string(),
  config: z.object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    expiresAt: z.string().optional(),
    syncSettings: z.object({
      syncContacts: z.boolean().default(true),
      syncLeads: z.boolean().default(true),
      syncDirection: z.enum(['bidirectional', 'to_platform', 'to_crm']).default('bidirectional'),
      autoSync: z.boolean().default(true),
      syncFrequency: z.enum(['realtime', 'hourly', 'daily']).default('hourly'),
      filterByOwner: z.boolean().default(false),
      selectedOwners: z.array(z.string()).default([]),
      customFieldMapping: z.boolean().default(false)
    }).optional()
  })
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = CreateIntegrationSchema.parse(body)
    
    const organizationId = await ensureDefaultOrganization()

    // Check if integration already exists
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, validatedData.type)
        )
      )

    if (existing.length > 0) {
      // Update existing integration
      const [updated] = await db
        .update(integrations)
        .set({
          name: validatedData.name,
          config: validatedData.config,
          status: 'active',
          lastSyncAt: new Date(),
        })
        .where(eq(integrations.id, existing[0].id))
        .returning()

      return NextResponse.json(updated)
    } else {
      // Create new integration
      const [newIntegration] = await db
        .insert(integrations)
        .values({
          organizationId,
          type: validatedData.type,
          name: validatedData.name,
          config: validatedData.config,
          status: 'active',
          createdAt: new Date(),
        })
        .returning()

      return NextResponse.json(newIntegration)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating integration:', error)
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    )
  }
} 