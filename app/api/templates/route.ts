import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { emailTemplates, organizations } from '@/lib/db/schema'
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

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
})

// GET - Fetch all email templates
export async function GET() {
  try {
    const organizationId = await ensureDefaultOrganization()
    
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.organizationId, organizationId))
      .orderBy(desc(emailTemplates.createdAt))
    
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create new email template
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createTemplateSchema.parse(body)
    
    const organizationId = await ensureDefaultOrganization()
    
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values({
        organizationId,
        name: validatedData.name,
        subject: validatedData.subject,
        body: validatedData.body,
        createdAt: new Date(),
      })
      .returning()
    
    return NextResponse.json(newTemplate, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PUT - Update email template
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)
    
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set(validatedData)
      .where(eq(emailTemplates.id, parseInt(templateId)))
      .returning()
    
    if (!updatedTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(updatedTemplate)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete email template
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }
    
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, parseInt(templateId)))
    
    return NextResponse.json({ message: 'Template deleted successfully' })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
} 