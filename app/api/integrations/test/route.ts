import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { integrations, organizations, contacts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

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

// Mock data for testing
const mockCRMData = {
  hubspot: [
    { email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe', company: 'Acme Corp', jobTitle: 'Sales Manager' },
    { email: 'jane.smith@techco.com', firstName: 'Jane', lastName: 'Smith', company: 'TechCo', jobTitle: 'Marketing Director' },
    { email: 'bob.wilson@startup.io', firstName: 'Bob', lastName: 'Wilson', company: 'StartupIO', jobTitle: 'CEO' }
  ],
  salesforce: [
    { email: 'alice.brown@enterprise.com', firstName: 'Alice', lastName: 'Brown', company: 'Enterprise Corp', jobTitle: 'VP Sales' },
    { email: 'charlie.davis@solutions.com', firstName: 'Charlie', lastName: 'Davis', company: 'Solutions Inc', jobTitle: 'Account Manager' },
    { email: 'diana.miller@consulting.com', firstName: 'Diana', lastName: 'Miller', company: 'Consulting Group', jobTitle: 'Senior Consultant' }
  ],
  pipedrive: [
    { email: 'erik.johnson@growth.com', firstName: 'Erik', lastName: 'Johnson', company: 'Growth Co', jobTitle: 'Business Developer' },
    { email: 'fiona.white@innovations.com', firstName: 'Fiona', lastName: 'White', company: 'Innovations Ltd', jobTitle: 'Product Manager' },
    { email: 'george.taylor@ventures.com', firstName: 'George', lastName: 'Taylor', company: 'Ventures Inc', jobTitle: 'Investment Manager' }
  ],
  zoho: [
    { email: 'helen.clark@services.com', firstName: 'Helen', lastName: 'Clark', company: 'Services LLC', jobTitle: 'Operations Manager' },
    { email: 'ian.evans@systems.com', firstName: 'Ian', lastName: 'Evans', company: 'Systems Corp', jobTitle: 'IT Director' },
    { email: 'julia.adams@digital.com', firstName: 'Julia', lastName: 'Adams', company: 'Digital Agency', jobTitle: 'Creative Director' }
  ]
}

// POST - Create test integration and sync mock data
export async function POST(request: Request) {
  try {
    const { provider } = await request.json()
    
    if (!provider || !mockCRMData[provider as keyof typeof mockCRMData]) {
      return NextResponse.json(
        { error: 'Invalid provider. Use: hubspot, salesforce, pipedrive, or zoho' },
        { status: 400 }
      )
    }
    
    const organizationId = await ensureDefaultOrganization()

    // Create or update test integration
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, provider)
        )
      )

    const integrationData = {
      organizationId,
      type: provider,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} (Test)`,
      config: {
        accessToken: 'test_token_' + Date.now(),
        refreshToken: 'test_refresh_token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        tokenType: 'Bearer',
        scope: 'test_scope',
        syncSettings: {
          syncContacts: true,
          syncLeads: true,
          syncDirection: 'bidirectional',
          autoSync: true,
          syncFrequency: 'hourly',
          filterByOwner: false,
          selectedOwners: [],
          customFieldMapping: false
        }
      },
      status: 'active',
      createdAt: new Date(),
    }

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set({
          config: integrationData.config,
          status: 'active',
          lastSyncAt: new Date(),
        })
        .where(eq(integrations.id, existing[0].id))
    } else {
      await db.insert(integrations).values(integrationData)
    }

    // Sync mock data
    const mockContacts = mockCRMData[provider as keyof typeof mockCRMData]
    let syncedCount = 0

    for (const contact of mockContacts) {
      try {
        await db.insert(contacts).values({
          organizationId,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          companyName: contact.company,
          jobTitle: contact.jobTitle,
          source: provider,
          customFields: {
            test_id: `test_${provider}_${Date.now()}_${syncedCount}`,
            test_data: contact,
            is_test_data: true
          },
          createdAt: new Date(),
        })
        
        syncedCount++
      } catch (error) {
        // Skip duplicates
        if (error instanceof Error && error.message.includes('duplicate')) {
          continue
        }
        console.error('Error inserting test contact:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test integration created and ${syncedCount} test contacts synced from ${provider}`,
      provider,
      total: mockContacts.length,
      synced: syncedCount,
      note: 'This is test data. To use real CRM data, set up OAuth credentials in environment variables.'
    })

  } catch (error) {
    console.error('Test integration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create test integration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET - List available test providers
export async function GET() {
  return NextResponse.json({
    availableProviders: Object.keys(mockCRMData),
    instructions: 'POST to this endpoint with {"provider": "hubspot"} to create test integration',
    note: 'This creates mock integrations for testing. For real CRM connections, use the OAuth flow.'
  })
} 