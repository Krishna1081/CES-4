import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { campaigns, sequences, sequenceSteps, SequenceStep } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  targetListId: z.number().optional(),
})

// GET - Fetch specific campaign with sequences
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id)
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }
    
    // Fetch campaign with sequences and steps
    const campaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
    
    if (campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Fetch sequences for this campaign
    const campaignSequences = await db
      .select()
      .from(sequences)
      .where(eq(sequences.campaignId, campaignId))
    
    // Fetch steps for all sequences if sequences exist
    let allSteps: SequenceStep[] = []
    if (campaignSequences.length > 0) {
      for (const sequence of campaignSequences) {
        const steps = await db
          .select()
          .from(sequenceSteps)
          .where(eq(sequenceSteps.sequenceId, sequence.id))
        allSteps = allSteps.concat(steps)
      }
    }

    return NextResponse.json({
      ...campaign[0],
      sequences: campaignSequences.map(seq => ({
        ...seq,
        steps: allSteps.filter(step => step.sequenceId === seq.id)
      }))
    })
  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

// PUT - Update campaign
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id)
    const body = await request.json()
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }
    
    const validatedData = updateCampaignSchema.parse(body)
    
    const [updatedCampaign] = await db
      .update(campaigns)
      .set(validatedData)
      .where(eq(campaigns.id, campaignId))
      .returning()
    
    if (!updatedCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(updatedCampaign)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

// DELETE - Delete campaign
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id)
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }
    
    // First get all sequences for this campaign
    const campaignSequences = await db
      .select()
      .from(sequences)
      .where(eq(sequences.campaignId, campaignId))

    // Delete all sequence steps for each sequence
    for (const sequence of campaignSequences) {
      await db
        .delete(sequenceSteps)
        .where(eq(sequenceSteps.sequenceId, sequence.id))
    }

    // Then delete all sequences
    await db
      .delete(sequences)
      .where(eq(sequences.campaignId, campaignId))
    
    // Finally delete the campaign
    await db
      .delete(campaigns)
      .where(eq(campaigns.id, campaignId))
    
    return NextResponse.json({ message: 'Campaign deleted successfully' })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
} 