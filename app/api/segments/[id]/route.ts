import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { lists, organizations } from '@/lib/db/schema'
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

// Validation schemas
const ConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.string(),
  logicalOperator: z.enum(['AND', 'OR']).optional(),
})

const UpdateSegmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required').optional(),
  conditions: z.array(ConditionSchema).min(1, 'At least one condition is required').optional(),
})

// GET - Get single segment
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await ensureDefaultOrganization()
    const segmentId = parseInt(params.id)
    
    if (isNaN(segmentId)) {
      return NextResponse.json(
        { error: 'Invalid segment ID' },
        { status: 400 }
      )
    }

    const [segment] = await db
      .select()
      .from(lists)
      .where(
        and(
          eq(lists.id, segmentId),
          eq(lists.organizationId, organizationId),
          eq(lists.type, 'dynamic')
        )
      )

    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: segment.id.toString(),
      name: segment.name,
      conditions: segment.criteria || [],
      createdAt: segment.createdAt,
      isActive: true,
    })
  } catch (error) {
    console.error('Error fetching segment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch segment' },
      { status: 500 }
    )
  }
}

// PUT - Update segment
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = UpdateSegmentSchema.parse(body)
    
    const organizationId = await ensureDefaultOrganization()
    const segmentId = parseInt(params.id)
    
    if (isNaN(segmentId)) {
      return NextResponse.json(
        { error: 'Invalid segment ID' },
        { status: 400 }
      )
    }

    // Check if segment exists
    const [existingSegment] = await db
      .select()
      .from(lists)
      .where(
        and(
          eq(lists.id, segmentId),
          eq(lists.organizationId, organizationId),
          eq(lists.type, 'dynamic')
        )
      )

    if (!existingSegment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      )
    }

    // Update the segment
    const updateData: any = {}
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.conditions !== undefined) {
      updateData.criteria = validatedData.conditions
    }

    const [updatedSegment] = await db
      .update(lists)
      .set(updateData)
      .where(eq(lists.id, segmentId))
      .returning()

    return NextResponse.json({
      id: updatedSegment.id.toString(),
      name: updatedSegment.name,
      conditions: updatedSegment.criteria || [],
      createdAt: updatedSegment.createdAt,
      isActive: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating segment:', error)
    return NextResponse.json(
      { error: 'Failed to update segment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete segment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = await ensureDefaultOrganization()
    const segmentId = parseInt(params.id)
    
    if (isNaN(segmentId)) {
      return NextResponse.json(
        { error: 'Invalid segment ID' },
        { status: 400 }
      )
    }

    // Check if segment exists
    const [existingSegment] = await db
      .select()
      .from(lists)
      .where(
        and(
          eq(lists.id, segmentId),
          eq(lists.organizationId, organizationId),
          eq(lists.type, 'dynamic')
        )
      )

    if (!existingSegment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      )
    }

    // Delete the segment
    await db
      .delete(lists)
      .where(eq(lists.id, segmentId))

    return NextResponse.json({
      message: 'Segment deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting segment:', error)
    return NextResponse.json(
      { error: 'Failed to delete segment' },
      { status: 500 }
    )
  }
} 