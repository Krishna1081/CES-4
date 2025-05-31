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

// HubSpot API functions
async function syncHubSpotContacts(accessToken: string, organizationId: number) {
  try {
    // HubSpot API with proper parameters and pagination
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?properties=email,firstname,lastname,company,jobtitle&limit=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HubSpot API error:', errorText)
      throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const hubspotContacts = data.results || []
    
    let syncedCount = 0
    let skippedCount = 0
    
    for (const contact of hubspotContacts) {
      const properties = contact.properties
      
      // Skip contacts without email
      if (!properties.email) continue
      
      try {
        // Check if contact already exists (by email + organization + hubspot_id)
        const existingContact = await db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, organizationId),
              eq(contacts.email, properties.email),
              eq(contacts.source, 'hubspot')
            )
          )
          .limit(1)

        if (existingContact.length > 0) {
          // Contact already exists, check if it needs updating
          const existing = existingContact[0]
          const existingHubSpotId = (existing.customFields as any)?.hubspot_id
          
          if (existingHubSpotId === contact.id) {
            // Same contact, skip
            skippedCount++
            continue
          }
        }

        await db.insert(contacts).values({
          organizationId,
          email: properties.email,
          firstName: properties.firstname || null,
          lastName: properties.lastname || null,
          companyName: properties.company || null,
          jobTitle: properties.jobtitle || null,
          source: 'hubspot',
          customFields: {
            hubspot_id: contact.id,
            hubspot_properties: properties
          },
          createdAt: new Date(),
        })
        
        syncedCount++
      } catch (error) {
        // Log detailed error info
        console.error('Error processing HubSpot contact:', {
          contactId: contact.id,
          email: properties.email,
          error: error instanceof Error ? error.message : error
        })
        
        // Still skip duplicates as fallback
        if (error instanceof Error && error.message.includes('duplicate')) {
          skippedCount++
          continue
        }
      }
    }
    
    return { 
      total: hubspotContacts.length, 
      synced: syncedCount,
      skipped: skippedCount,
      message: `Synced ${syncedCount} new contacts, skipped ${skippedCount} existing contacts`
    }
  } catch (error) {
    console.error('HubSpot sync error:', error)
    throw error
  }
}

// Salesforce API functions - FIXED
async function syncSalesforceContacts(accessToken: string, instanceUrl: string, organizationId: number) {
  try {
    // Correct Salesforce SOQL query to get contacts
    const query = encodeURIComponent("SELECT Id, Email, FirstName, LastName, Account.Name, Title FROM Contact WHERE Email != null LIMIT 200")
    const response = await fetch(`${instanceUrl}/services/data/v52.0/query?q=${query}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Salesforce API error:', errorText)
      throw new Error(`Salesforce API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const salesforceContacts = data.records || []
    
    let syncedCount = 0
    let skippedCount = 0
    
    for (const contact of salesforceContacts) {
      // Skip contacts without email
      if (!contact.Email) continue
      
      try {
        // Check if contact already exists (by email + organization + salesforce_id)
        const existingContact = await db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, organizationId),
              eq(contacts.email, contact.Email),
              eq(contacts.source, 'salesforce')
            )
          )
          .limit(1)

        if (existingContact.length > 0) {
          // Contact already exists, check if it needs updating
          const existing = existingContact[0]
          const existingSalesforceId = (existing.customFields as any)?.salesforce_id
          
          if (existingSalesforceId === contact.Id) {
            // Same contact, skip
            skippedCount++
            continue
          }
        }

        await db.insert(contacts).values({
          organizationId,
          email: contact.Email,
          firstName: contact.FirstName || null,
          lastName: contact.LastName || null,
          companyName: contact.Account?.Name || null,
          jobTitle: contact.Title || null,
          source: 'salesforce',
          customFields: {
            salesforce_id: contact.Id,
            salesforce_data: contact
          },
          createdAt: new Date(),
        })
        
        syncedCount++
      } catch (error) {
        // Log detailed error info
        console.error('Error processing Salesforce contact:', {
          contactId: contact.Id,
          email: contact.Email,
          error: error instanceof Error ? error.message : error
        })
        
        // Still skip duplicates as fallback
        if (error instanceof Error && error.message.includes('duplicate')) {
          skippedCount++
          continue
        }
      }
    }
    
    return { 
      total: salesforceContacts.length, 
      synced: syncedCount,
      skipped: skippedCount,
      message: `Synced ${syncedCount} new contacts, skipped ${skippedCount} existing contacts`
    }
  } catch (error) {
    console.error('Salesforce sync error:', error)
    throw error
  }
}

// Pipedrive API functions - FIXED
async function syncPipedriveContacts(accessToken: string, organizationId: number) {
  try {
    // Pipedrive uses OAuth bearer token, not API token
    const response = await fetch('https://api.pipedrive.com/v1/persons?limit=500', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pipedrive API error:', errorText)
      throw new Error(`Pipedrive API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Pipedrive API error: ${data.error || 'Unknown error'}`)
    }
    
    const pipedriveContacts = data.data || []
    
    let syncedCount = 0
    let skippedCount = 0
    
    for (const person of pipedriveContacts) {
      try {
        const emails = person.email || []
        const primaryEmail = emails.find((e: any) => e.primary) || emails[0]
        
        // Skip persons without email
        if (!primaryEmail?.value) continue
        
        // Check if contact already exists (by email + organization + pipedrive_id)
        const existingContact = await db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, organizationId),
              eq(contacts.email, primaryEmail.value),
              eq(contacts.source, 'pipedrive')
            )
          )
          .limit(1)

        if (existingContact.length > 0) {
          // Contact already exists, check if it needs updating
          const existing = existingContact[0]
          const existingPipedriveId = (existing.customFields as any)?.pipedrive_id
          
          if (existingPipedriveId === person.id) {
            // Same contact, skip
            skippedCount++
            continue
          }
        }
        
        await db.insert(contacts).values({
          organizationId,
          email: primaryEmail.value,
          firstName: person.first_name || null,
          lastName: person.last_name || null,
          companyName: person.org_name || null,
          jobTitle: null,
          source: 'pipedrive',
          customFields: {
            pipedrive_id: person.id,
            pipedrive_data: person
          },
          createdAt: new Date(),
        })
        
        syncedCount++
      } catch (error) {
        // Log detailed error info
        console.error('Error processing Pipedrive contact:', {
          personId: person.id,
          email: person.email?.[0]?.value,
          error: error instanceof Error ? error.message : error
        })
        
        // Still skip duplicates as fallback
        if (error instanceof Error && error.message.includes('duplicate')) {
          skippedCount++
          continue
        }
      }
    }
    
    return { 
      total: pipedriveContacts.length, 
      synced: syncedCount,
      skipped: skippedCount,
      message: `Synced ${syncedCount} new contacts, skipped ${skippedCount} existing contacts`
    }
  } catch (error) {
    console.error('Pipedrive sync error:', error)
    throw error
  }
}

// Zoho CRM API functions - FIXED
async function syncZohoContacts(accessToken: string, organizationId: number) {
  try {
    // Zoho CRM API with proper parameters
    const response = await fetch('https://www.zohoapis.com/crm/v2/Contacts?fields=Email,First_Name,Last_Name,Account_Name,Title&per_page=200', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Zoho API error:', errorText)
      throw new Error(`Zoho API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const zohoContacts = data.data || []
    
    let syncedCount = 0
    let skippedCount = 0
    
    for (const contact of zohoContacts) {
      // Skip contacts without email
      if (!contact.Email) continue
      
      try {
        // Check if contact already exists (by email + organization + zoho_id)
        const existingContact = await db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.organizationId, organizationId),
              eq(contacts.email, contact.Email),
              eq(contacts.source, 'zoho')
            )
          )
          .limit(1)

        if (existingContact.length > 0) {
          // Contact already exists, check if it needs updating
          const existing = existingContact[0]
          const existingZohoId = (existing.customFields as any)?.zoho_id
          
          if (existingZohoId === contact.id) {
            // Same contact, skip
            skippedCount++
            continue
          }
        }

        await db.insert(contacts).values({
          organizationId,
          email: contact.Email,
          firstName: contact.First_Name || null,
          lastName: contact.Last_Name || null,
          companyName: contact.Account_Name || null,
          jobTitle: contact.Title || null,
          source: 'zoho',
          customFields: {
            zoho_id: contact.id,
            zoho_data: contact
          },
          createdAt: new Date(),
        })
        
        syncedCount++
      } catch (error) {
        // Log detailed error info
        console.error('Error processing Zoho contact:', {
          contactId: contact.id,
          email: contact.Email,
          error: error instanceof Error ? error.message : error
        })
        
        // Still skip duplicates as fallback
        if (error instanceof Error && error.message.includes('duplicate')) {
          skippedCount++
          continue
        }
      }
    }
    
    return { 
      total: zohoContacts.length, 
      synced: syncedCount,
      skipped: skippedCount,
      message: `Synced ${syncedCount} new contacts, skipped ${skippedCount} existing contacts`
    }
  } catch (error) {
    console.error('Zoho sync error:', error)
    throw error
  }
}

// POST - Trigger manual sync
export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const organizationId = await ensureDefaultOrganization()
    const provider = params.provider

    // Get integration configuration
    const integration = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, provider)
        )
      )
      .limit(1)

    if (integration.length === 0) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    const config = integration[0].config as any
    if (!config?.accessToken) {
      return NextResponse.json(
        { error: 'Integration not properly configured. Please reconnect your CRM.' },
        { status: 400 }
      )
    }

    // Update integration status to syncing
    await db
      .update(integrations)
      .set({ status: 'syncing' })
      .where(eq(integrations.id, integration[0].id))

    let result
    
    try {
      switch (provider) {
        case 'hubspot':
          result = await syncHubSpotContacts(config.accessToken, organizationId)
          break
        
        case 'salesforce':
          result = await syncSalesforceContacts(
            config.accessToken, 
            config.instanceUrl || 'https://na1.salesforce.com', 
            organizationId
          )
          break
        
        case 'pipedrive':
          result = await syncPipedriveContacts(config.accessToken, organizationId)
          break
        
        case 'zoho':
          result = await syncZohoContacts(config.accessToken, organizationId)
          break
        
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      // Update integration status to active and last sync time
      await db
        .update(integrations)
        .set({ 
          status: 'active',
          lastSyncAt: new Date()
        })
        .where(eq(integrations.id, integration[0].id))

      return NextResponse.json({
        success: true,
        provider,
        ...result
      })

    } catch (syncError) {
      console.error(`${provider} sync error:`, syncError)
      
      // Update integration status to error
      await db
        .update(integrations)
        .set({ status: 'error' })
        .where(eq(integrations.id, integration[0].id))
      
      // Return detailed error message
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error'
      return NextResponse.json(
        { 
          error: 'Sync failed',
          message: `${provider} sync failed: ${errorMessage}`,
          provider
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { 
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET - Get sync status
export async function GET(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const organizationId = await ensureDefaultOrganization()
    const provider = params.provider

    const integration = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, provider)
        )
      )
      .limit(1)

    if (integration.length === 0) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: integration[0].status,
      lastSync: integration[0].lastSyncAt,
      provider: provider,
      config: integration[0].config ? 'configured' : 'not configured'
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
} 