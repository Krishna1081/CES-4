import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { 
  campaigns, 
  sequences, 
  sequenceSteps, 
  abTests,
  sentEmails,
  emailEvents 
} from '@/lib/db/schema'
import { eq, and, gte, lte, sql, count } from 'drizzle-orm'
import { format, parseISO } from 'date-fns'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID' },
        { status: 400 }
      )
    }

    // Default to last 7 days if no dates provided
    const from = fromDate ? parseISO(fromDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const to = toDate ? parseISO(toDate) : new Date()

    // Fetch campaign details
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

    if (campaignSequences.length === 0) {
      return NextResponse.json({
        campaignId,
        campaignName: campaign[0].name,
        steps: []
      })
    }

    // Fetch steps for all sequences
    const steps = await db
      .select()
      .from(sequenceSteps)
      .where(
        eq(sequenceSteps.sequenceId, campaignSequences[0].id)
      )
      .orderBy(sequenceSteps.stepOrder)

    // Fetch A/B tests for these steps
    const stepIds = steps.map(s => s.id)
    const abTestData = await db
      .select()
      .from(abTests)
      .where(
        sql`${abTests.stepId} IN (${stepIds.join(',')})`
      )

    // Fetch metrics for each step
    const stepsWithMetrics = await Promise.all(steps.map(async (step) => {
      const metrics = await db
        .select({
          totalSent: count(),
          opened: count(
            sql`CASE WHEN ${emailEvents.type} = 'open' THEN 1 END`
          ),
          clicked: count(
            sql`CASE WHEN ${emailEvents.type} = 'click' THEN 1 END`
          ),
          replied: count(
            sql`CASE WHEN ${emailEvents.type} = 'reply' THEN 1 END`
          ),
        })
        .from(sentEmails)
        .leftJoin(
          emailEvents,
          eq(emailEvents.sentEmailId, sentEmails.id)
        )
        .where(
          and(
            eq(sentEmails.stepId, step.id),
            gte(sentEmails.sentAt, from),
            lte(sentEmails.sentAt, to)
          )
        )

      const stepMetrics = metrics[0]
      const totalSent = Number(stepMetrics.totalSent)
      const opened = Number(stepMetrics.opened)
      const clicked = Number(stepMetrics.clicked)
      const replied = Number(stepMetrics.replied)

      // Find A/B test for this step
      const abTest = abTestData.find(test => test.stepId === step.id)
      let abTestWithVariations = undefined

      if (abTest) {
        // Fetch metrics for each variation
        const variations = await Promise.all(
          (abTest.variations as any[]).map(async (variation) => {
            const variationMetrics = await db
              .select({
                totalSent: count(),
                opened: count(
                  sql`CASE WHEN ${emailEvents.type} = 'open' THEN 1 END`
                ),
                clicked: count(
                  sql`CASE WHEN ${emailEvents.type} = 'click' THEN 1 END`
                ),
                replied: count(
                  sql`CASE WHEN ${emailEvents.type} = 'reply' THEN 1 END`
                ),
              })
              .from(sentEmails)
              .leftJoin(
                emailEvents,
                eq(emailEvents.sentEmailId, sentEmails.id)
              )
              .where(
                and(
                  eq(sentEmails.stepId, step.id),
                  sql`${sentEmails.metadata}::jsonb->>'variationId' = ${variation.id}::text`,
                  gte(sentEmails.sentAt, from),
                  lte(sentEmails.sentAt, to)
                )
              )

            const metrics = variationMetrics[0]
            const totalSent = Number(metrics.totalSent)
            const opened = Number(metrics.opened)
            const clicked = Number(metrics.clicked)
            const replied = Number(metrics.replied)

            return {
              id: variation.id,
              name: variation.name,
              totalSent,
              openRate: totalSent ? opened / totalSent : 0,
              clickRate: totalSent ? clicked / totalSent : 0,
              replyRate: totalSent ? replied / totalSent : 0,
            }
          })
        )

        abTestWithVariations = {
          id: abTest.id,
          variableTested: abTest.variableTested,
          variations,
          winner: abTest.winnerVariationId
        }
      }

      return {
        stepId: step.id,
        stepOrder: step.stepOrder,
        type: step.type,
        subject: (step.configuration as any)?.subject,
        totalSent,
        opened,
        clicked,
        replied,
        openRate: totalSent ? opened / totalSent : 0,
        clickRate: totalSent ? clicked / totalSent : 0,
        replyRate: totalSent ? replied / totalSent : 0,
        abTest: abTestWithVariations
      }
    }))

    return NextResponse.json({
      campaignId,
      campaignName: campaign[0].name,
      steps: stepsWithMetrics
    })

  } catch (error) {
    console.error('Campaign steps API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign steps data' },
      { status: 500 }
    )
  }
} 