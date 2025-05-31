import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { lists, organizations } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
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

const createListSchema = z.object({
  name: z.string().min(1, 'List name is required'),
  type: z.enum(['static', 'segment']).default('static'),
  criteria: z.object({
    rules: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.string(),
    })),
    operator: z.enum(['AND', 'OR']).default('AND'),
  }).optional(),
})

// GET - Fetch all lists/segments
export async function GET() {
  try {
    const organizationId = await ensureDefaultOrganization()
    
    const allLists = await db
      .select()
      .from(lists)
      .where(eq(lists.organizationId, organizationId))
      .orderBy(desc(lists.createdAt))
    
    return NextResponse.json(allLists)
  } catch (error) {
    console.error('Error fetching lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    )
  }
}

// POST - Create new list/segment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Creating list with data:', body)
    
    const validatedData = createListSchema.parse(body)
    console.log('Validated data:', validatedData)
    
    const organizationId = await ensureDefaultOrganization()
    console.log('Organization ID:', organizationId)
    
    const [newList] = await db
      .insert(lists)
      .values({
        organizationId,
        name: validatedData.name,
        type: validatedData.type,
        criteria: validatedData.criteria || null,
        createdAt: new Date(),
      })
      .returning()
    
    console.log('Created list:', newList)
    return NextResponse.json(newList, { status: 201 })
  } catch (error) {
    console.error('Detailed error creating list:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 