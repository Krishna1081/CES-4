import 'dotenv/config'
import { db } from '@/lib/db'
import { mailboxes, sentEmails, emailEvents } from '@/lib/db/schema'

async function testMailboxStats() {
  try {
    // First, run the seed data script
    await import('./seed-test-data.mjs')

    // Test fetching stats for mailbox 1
    const response = await fetch('http://localhost:3000/api/mailboxes/1/stats')
    const stats = await response.json()

    console.log('Mailbox 1 Statistics:')
    console.log('--------------------')
    console.log('Sent:', stats.sent)
    console.log('Replies:', stats.replies)
    console.log('Received:', stats.received)
    console.log('Saved:', stats.saved)
    console.log('Success Rate:', stats.successRate + '%')

    // Verify the numbers match our seeded data
    const expectedStats = {
      sent: 2, // We created 2 sent emails for mailbox 1
      replies: 1, // We created 1 reply event
      received: 1, // We created 1 received event
      saved: 0, // We didn't create any saved emails
      successRate: 100 // (1 reply + 1 received) / 2 sent * 100
    }

    const matches = Object.entries(expectedStats).every(
      ([key, value]) => stats[key] === value
    )

    if (matches) {
      console.log('\n✅ All statistics match expected values!')
    } else {
      console.log('\n❌ Some statistics do not match expected values:')
      Object.entries(expectedStats).forEach(([key, value]) => {
        if (stats[key] !== value) {
          console.log(`${key}: Expected ${value}, got ${stats[key]}`)
        }
      })
    }

  } catch (error) {
    console.error('Error testing mailbox stats:', error)
  } finally {
    // Clean up test data
    await db.delete(emailEvents).execute()
    await db.delete(sentEmails).execute()
    await db.delete(mailboxes).execute()
  }
}

testMailboxStats() 