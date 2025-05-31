import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { organizations, contacts } from '@/lib/db/schema'
import { eq, and, like, gte, lte, isNotNull, SQL } from 'drizzle-orm'
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

const PreviewSegmentSchema = z.object({
  conditions: z.array(ConditionSchema).min(1, 'At least one condition is required'),
})

// POST - Preview segment matches
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = PreviewSegmentSchema.parse(body)
    
    const organizationId = await ensureDefaultOrganization()

    // Calculate matching contacts count
    const matchingContacts = await getSegmentContactCount(validatedData.conditions, organizationId)

    return NextResponse.json({
      matchingContacts,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error previewing segment:', error)
    return NextResponse.json(
      { error: 'Failed to preview segment' },
      { status: 500 }
    )
  }
}

// Helper function to get contact count for a segment
async function getSegmentContactCount(conditions: any[], organizationId: number): Promise<number> {
  try {
    const whereClause = buildWhereClause(conditions, organizationId)
    
    const result = await db
      .select()
      .from(contacts)
      .where(whereClause)

    return result.length
  } catch (error) {
    console.error('Error getting segment contact count:', error)
    return 0
  }
}

// Helper function to build where clause based on conditions
function buildWhereClause(conditions: any[], organizationId: number): SQL<unknown> {
  const baseCondition = eq(contacts.organizationId, organizationId)
  
  if (conditions.length === 0) {
    return baseCondition
  }

  // Build conditions, filtering out null values
  const whereConditions = conditions
    .map((condition) => buildSingleCondition(condition))
    .filter((condition): condition is SQL<unknown> => condition !== null)

  if (whereConditions.length === 0) {
    return baseCondition
  }

  // Combine with AND logic for now (we can enhance this later for OR logic)
  return and(baseCondition, ...whereConditions)!
}

// Helper function to build a single condition
function buildSingleCondition(condition: any): SQL<unknown> | null {
  const { field, operator, value } = condition

  switch (field) {
    case 'email':
      return buildStringCondition(contacts.email, operator, value)
    case 'firstName':
      return buildStringCondition(contacts.firstName, operator, value)
    case 'lastName':
      return buildStringCondition(contacts.lastName, operator, value)
    case 'companyName':
      return buildStringCondition(contacts.companyName, operator, value)
    case 'jobTitle':
      return buildStringCondition(contacts.jobTitle, operator, value)
    case 'source':
      return buildStringCondition(contacts.source, operator, value)
    case 'createdAt':
      return buildDateCondition(contacts.createdAt, operator, value)
    default:
      return null
  }
}

// Helper function to build string conditions
function buildStringCondition(column: any, operator: string, value: string): SQL<unknown> | null {
  switch (operator) {
    case 'equals':
      return eq(column, value)
    case 'contains':
      return like(column, `%${value}%`)
    case 'startsWith':
      return like(column, `${value}%`)
    case 'endsWith':
      return like(column, `%${value}`)
    case 'notEquals':
      const notEqualsCondition = and(isNotNull(column), eq(column, value))
      return notEqualsCondition || null
    default:
      return null
  }
}

// Helper function to build date conditions
function buildDateCondition(column: any, operator: string, value: string): SQL<unknown> | null {
  const date = new Date(value)
  
  if (isNaN(date.getTime())) {
    return null // Invalid date
  }
  
  switch (operator) {
    case 'on':
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      const onCondition = and(gte(column, startOfDay), lte(column, endOfDay))
      return onCondition || null
    case 'before':
      return lte(column, date)
    case 'after':
      return gte(column, date)
    default:
      return null
  }
} 