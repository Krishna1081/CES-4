import { db } from '../lib/db/drizzle'
import {
  users,
  organizations,
  teams,
  teamMembers,
  mailboxes,
  domains,
  contacts,
  lists,
  contactListMemberships,
  campaigns,
  sequences,
  sequenceSteps,
  emailTemplates,
  sentEmails,
  emailEvents,
  suppressionList,
  abTests,
  tasks,
  warmupSettings,
  warmupInteractions,
  integrations,
  settings,
  auditLogs,
  activityLogs,
  invitations,
} from '../lib/db/schema'

async function clearDatabase() {
  console.log('🧹 Starting database cleanup...')
  
  try {
    // Delete records in reverse dependency order to avoid foreign key constraints
    
    console.log('📧 Clearing email and campaign data...')
    await db.delete(emailEvents)
    await db.delete(sentEmails)
    await db.delete(abTests)
    await db.delete(sequenceSteps)
    await db.delete(sequences)
    await db.delete(campaigns)
    await db.delete(emailTemplates)
    
    console.log('👥 Clearing contact and list data...')
    await db.delete(contactListMemberships)
    await db.delete(suppressionList)
    await db.delete(contacts)
    await db.delete(lists)
    
    console.log('📬 Clearing mailbox and domain data...')
    await db.delete(warmupInteractions)
    await db.delete(warmupSettings)
    await db.delete(mailboxes)
    await db.delete(domains)
    
    console.log('🔧 Clearing settings and integrations...')
    await db.delete(tasks)
    await db.delete(integrations)
    await db.delete(settings)
    
    console.log('📊 Clearing audit and activity logs...')
    await db.delete(auditLogs)
    await db.delete(activityLogs)
    
    console.log('👫 Clearing team and user data...')
    await db.delete(invitations)
    await db.delete(teamMembers)
    await db.delete(teams)
    await db.delete(users)
    await db.delete(organizations)
    
    console.log('✅ Database cleared successfully!')
    console.log('📋 All tables are now empty but structure is preserved.')
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...')
    const userCount = await db.select().from(users)
    const orgCount = await db.select().from(organizations)
    const teamCount = await db.select().from(teams)
    
    console.log(`👤 Users: ${userCount.length}`)
    console.log(`🏢 Organizations: ${orgCount.length}`)
    console.log(`👥 Teams: ${teamCount.length}`)
    
    if (userCount.length === 0 && orgCount.length === 0 && teamCount.length === 0) {
      console.log('🎉 Cleanup verified! Database is empty.')
    } else {
      console.log('⚠️  Some records may still exist.')
    }
    
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw error
  }
}

// Run the cleanup
clearDatabase()
  .then(() => {
    console.log('\n🏁 Database cleanup completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Database cleanup failed:', error)
    process.exit(1)
  }) 