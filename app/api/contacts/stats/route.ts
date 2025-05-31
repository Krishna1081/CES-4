import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { contacts, organizations } from '@/lib/db/schema'
import { count, eq, gte, and } from 'drizzle-orm'

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
    
    return defaultOrg.id
  } catch (error) {
    console.error('Error ensuring default organization:', error)
    throw new Error('Failed to ensure default organization exists')
  }
}

export async function GET() {
  try {
    // Ensure default organization exists and get its ID
    const organizationId = await ensureDefaultOrganization()
    
    // Get start of current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get total contacts count
    const [totalContactsResult] = await db
      .select({ count: count() })
      .from(contacts)
      .where(eq(contacts.organizationId, organizationId))

    // Get new contacts this month
    const [newThisMonthResult] = await db
      .select({ count: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, organizationId),
          gte(contacts.createdAt, startOfMonth)
        )
      )

    // Get verified contacts count
    const [verifiedContactsResult] = await db
      .select({ count: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, organizationId),
          eq(contacts.verificationStatus, 'verified')
        )
      )

    // Calculate unverified as total minus verified
    const totalContacts = totalContactsResult?.count || 0
    const verifiedContacts = verifiedContactsResult?.count || 0
    const unverifiedContacts = totalContacts - verifiedContacts

    return NextResponse.json({
      totalContacts,
      newThisMonth: newThisMonthResult?.count || 0,
      verifiedContacts,
      unverifiedContacts
    })
  } catch (error) {
    console.error('Error fetching contact stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact stats' },
      { status: 500 }
    )
  }
} 