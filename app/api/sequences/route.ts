import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { sequences, sequenceSteps } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createSequenceSchema = z.object({
  campaignId: z.number(),
  name: z.string().min(1, 'Sequence name is required'),
})

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

// GET - Fetch sequences for a campaign
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }
    
    const campaignSequences = await db
      .select()
      .from(sequences)
      .where(eq(sequences.campaignId, parseInt(campaignId)))
    
    // Fetch steps for each sequence
    const sequencesWithSteps = await Promise.all(
      campaignSequences.map(async (sequence) => {
        const steps = await db
          .select()
          .from(sequenceSteps)
          .where(eq(sequenceSteps.sequenceId, sequence.id))
          .orderBy(sequenceSteps.stepOrder)
        
        return {
          ...sequence,
          steps
        }
      })
    )
    
    return NextResponse.json(sequencesWithSteps)
  } catch (error) {
    console.error('Error fetching sequences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sequences' },
      { status: 500 }
    )
  }
}

// POST - Create new sequence
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createSequenceSchema.parse(body)
    
    const [newSequence] = await db
      .insert(sequences)
      .values({
        campaignId: validatedData.campaignId,
        name: validatedData.name,
        createdAt: new Date(),
      })
      .returning()
    
    return NextResponse.json(newSequence, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating sequence:', error)
    return NextResponse.json(
      { error: 'Failed to create sequence' },
      { status: 500 }
    )
  }
} 