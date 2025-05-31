import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { sequenceSteps } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createStepSchema = z.object({
  sequenceId: z.number(),
  stepOrder: z.number(),
  type: z.enum(['email', 'delay', 'condition', 'task']),
  configuration: z.object({
    // Email step config
    templateId: z.number().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    tracking: z.object({
      opens: z.boolean().optional(),
      clicks: z.boolean().optional(),
    }).optional(),
    abTest: z.object({
      enabled: z.boolean().optional(),
      variable: z.enum(['subject', 'body']).optional(),
      variations: z.array(z.object({
        id: z.string(),
        subject: z.string().optional(),
        body: z.string().optional(),
        percentage: z.number(),
      })).optional(),
      duration: z.number().optional(),
    }).optional(),
    
    // Delay step config
    delayDays: z.number().optional(),
    delayHours: z.number().optional(),
    
    // Condition step config
    condition: z.object({
      type: z.enum(['replied', 'opened', 'clicked', 'bounced']).optional(),
      operator: z.enum(['is', 'is_not']).optional(),
    }).optional(),
    truePath: z.number().optional(),
    falsePath: z.number().optional(),
    
    // Task step config
    taskType: z.enum(['call', 'linkedin', 'manual']).optional(),
    taskTitle: z.string().optional(),
    taskDescription: z.string().optional(),
  }),
})

const updateStepSchema = z.object({
  stepOrder: z.number().optional(),
  type: z.enum(['email', 'delay', 'condition', 'task']).optional(),
  configuration: z.object({
    templateId: z.number().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    tracking: z.object({
      opens: z.boolean().optional(),
      clicks: z.boolean().optional(),
    }).optional(),
    abTest: z.object({
      enabled: z.boolean().optional(),
      variable: z.enum(['subject', 'body']).optional(),
      variations: z.array(z.object({
        id: z.string(),
        subject: z.string().optional(),
        body: z.string().optional(),
        percentage: z.number(),
      })).optional(),
      duration: z.number().optional(),
    }).optional(),
    delayDays: z.number().optional(),
    delayHours: z.number().optional(),
    condition: z.object({
      type: z.enum(['replied', 'opened', 'clicked', 'bounced']).optional(),
      operator: z.enum(['is', 'is_not']).optional(),
    }).optional(),
    truePath: z.number().optional(),
    falsePath: z.number().optional(),
    taskType: z.enum(['call', 'linkedin', 'manual']).optional(),
    taskTitle: z.string().optional(),
    taskDescription: z.string().optional(),
  }).optional(),
})

// GET - Fetch steps for a sequence
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get('sequenceId')
    
    if (!sequenceId) {
      return NextResponse.json(
        { error: 'Sequence ID is required' },
        { status: 400 }
      )
    }
    
    const steps = await db
      .select()
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, parseInt(sequenceId)))
      .orderBy(sequenceSteps.stepOrder)
    
    return NextResponse.json(steps)
  } catch (error) {
    console.error('Error fetching sequence steps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sequence steps' },
      { status: 500 }
    )
  }
}

// POST - Create new sequence step
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createStepSchema.parse(body)
    
    const [newStep] = await db
      .insert(sequenceSteps)
      .values({
        sequenceId: validatedData.sequenceId,
        stepOrder: validatedData.stepOrder,
        type: validatedData.type,
        configuration: validatedData.configuration,
      })
      .returning()
    
    return NextResponse.json(newStep, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating sequence step:', error)
    return NextResponse.json(
      { error: 'Failed to create sequence step' },
      { status: 500 }
    )
  }
}

// PUT - Update sequence step
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stepId = searchParams.get('id')
    
    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const validatedData = updateStepSchema.parse(body)
    
    const [updatedStep] = await db
      .update(sequenceSteps)
      .set(validatedData)
      .where(eq(sequenceSteps.id, parseInt(stepId)))
      .returning()
    
    if (!updatedStep) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(updatedStep)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating sequence step:', error)
    return NextResponse.json(
      { error: 'Failed to update sequence step' },
      { status: 500 }
    )
  }
}

// DELETE - Delete sequence step
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stepId = searchParams.get('id')
    
    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      )
    }
    
    await db
      .delete(sequenceSteps)
      .where(eq(sequenceSteps.id, parseInt(stepId)))
    
    return NextResponse.json({ message: 'Step deleted successfully' })
  } catch (error) {
    console.error('Error deleting sequence step:', error)
    return NextResponse.json(
      { error: 'Failed to delete sequence step' },
      { status: 500 }
    )
  }
} 