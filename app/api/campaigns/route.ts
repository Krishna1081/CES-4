import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { campaigns, organizations, lists, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
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

// Helper function to ensure default user exists
async function ensureDefaultUser(): Promise<number> {
  try {
    const existingUsers = await db.select().from(users).limit(1)
    
    if (existingUsers.length > 0) {
      return existingUsers[0].id
    }
    
    const [defaultUser] = await db
      .insert(users)
      .values({
        name: 'Default User',
        email: 'admin@example.com',
        passwordHash: 'hashed_password_placeholder',
        role: 'admin',
        firstName: 'Default',
        lastName: 'User',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    
    return defaultUser.id
  } catch (error) {
    console.error('Error ensuring default user:', error)
    throw new Error('Failed to ensure default user exists')
  }
}

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  goal: z.string().optional(),
  targetListId: z.number().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
})

// GET - Fetch all campaigns
export async function GET() {
  try {
    const organizationId = await ensureDefaultOrganization()
    
    const allCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        goal: campaigns.goal,
        status: campaigns.status,
        targetListId: campaigns.targetListId,
        createdAt: campaigns.createdAt,
        targetList: {
          id: lists.id,
          name: lists.name,
        }
      })
      .from(campaigns)
      .leftJoin(lists, eq(campaigns.targetListId, lists.id))
      .where(eq(campaigns.organizationId, organizationId))
      .orderBy(desc(campaigns.createdAt))
    
    return NextResponse.json(allCampaigns)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST - Create new campaign
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Creating campaign with data:', body)
    
    const validatedData = createCampaignSchema.parse(body)
    console.log('Validated data:', validatedData)
    
    const organizationId = await ensureDefaultOrganization()
    console.log('Organization ID:', organizationId)
    
    const defaultUserId = await ensureDefaultUser()
    console.log('User ID:', defaultUserId)
    
    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        organizationId,
        userId: defaultUserId,
        name: validatedData.name,
        goal: validatedData.goal,
        status: validatedData.status,
        targetListId: validatedData.targetListId,
        createdAt: new Date(),
      })
      .returning()
    
    console.log('Created campaign:', newCampaign)
    return NextResponse.json(newCampaign, { status: 201 })
  } catch (error) {
    console.error('Detailed error creating campaign:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create campaign', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 