import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { integrations, organizations } from '@/lib/db/schema'
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

// OAuth configuration for different providers
const oauthConfig = {
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID,
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.owners.read oauth'
  },
  salesforce: {
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: 'api refresh_token'
  },
  pipedrive: {
    clientId: process.env.PIPEDRIVE_CLIENT_ID,
    clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET,
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
    scopes: 'deals:read persons:read organizations:read'
  },
  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: 'ZohoCRM.modules.ALL ZohoCRM.settings.ALL'
  }
}

// GET - Handle OAuth callback
export async function GET(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, process.env.BASE_URL || request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/integrations?error=no_code', process.env.BASE_URL || request.url)
      )
    }

    const provider = params.provider
    const config = oauthConfig[provider as keyof typeof oauthConfig]

    if (!config) {
      return NextResponse.redirect(
        new URL('/integrations?error=invalid_provider', process.env.BASE_URL || request.url)
      )
    }

    // Use environment variable for redirect URI
    const baseUrl = process.env.BASE_URL || new URL(request.url).origin
    const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}`

    // Exchange authorization code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId!,
        client_secret: config.clientSecret!,
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(
        new URL('/integrations?error=token_exchange_failed', process.env.BASE_URL || request.url)
      )
    }

    const tokenData = await tokenResponse.json()
    const organizationId = await ensureDefaultOrganization()

    // Store integration credentials
    const integrationData = {
      organizationId,
      type: provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      config: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
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

    // Check if integration already exists
    const existing = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.type, provider)
        )
      )

    if (existing.length > 0) {
      // Update existing integration
      await db
        .update(integrations)
        .set({
          config: integrationData.config,
          status: 'active',
          lastSyncAt: new Date(),
        })
        .where(eq(integrations.id, existing[0].id))
    } else {
      // Create new integration
      await db.insert(integrations).values(integrationData)
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      new URL('/integrations?connected=' + provider, process.env.BASE_URL || request.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/integrations?error=callback_failed', process.env.BASE_URL || request.url)
    )
  }
}

// POST - Initiate OAuth flow
export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider
    const config = oauthConfig[provider as keyof typeof oauthConfig]

    if (!config) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Use environment variable for redirect URI
    const baseUrl = process.env.BASE_URL || new URL(request.url).origin
    const redirectUri = `${baseUrl}/api/integrations/oauth/${provider}`
    const state = Math.random().toString(36).substring(7)

    let authUrl = ''

    switch (provider) {
      case 'hubspot':
        authUrl = `https://app.hubspot.com/oauth/authorize?` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(config.scopes)}&` +
          `state=${state}`
        break

      case 'salesforce':
        authUrl = `https://login.salesforce.com/services/oauth2/authorize?` +
          `response_type=code&` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(config.scopes)}&` +
          `state=${state}`
        break

      case 'pipedrive':
        authUrl = `https://oauth.pipedrive.com/oauth/authorize?` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `state=${state}`
        break

      case 'zoho':
        authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
          `response_type=code&` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(config.scopes)}&` +
          `state=${state}&` +
          `access_type=offline`
        break

      default:
        return NextResponse.json(
          { error: 'Provider not supported' },
          { status: 400 }
        )
    }

    return NextResponse.json({ authUrl, state, redirectUri })
  } catch (error) {
    console.error('OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    )
  }
} 