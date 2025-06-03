import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mailboxes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { getUserWithOrganization } from '@/lib/db/auth-queries'
import dns from 'dns'
import { promisify } from 'util'

const resolveTxt = promisify(dns.resolveTxt)

interface DNSRecord {
  type: string
  record: string
  status: 'valid' | 'invalid' | 'not_found'
}

interface DNSValidationResult {
  email: string
  domain: string
  spf: DNSRecord
  dkim: DNSRecord
  dmarc: DNSRecord
}

export async function POST() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userWithOrg = await getUserWithOrganization(session.user.id)
    if (!userWithOrg?.organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get all mailboxes for the organization
    const orgMailboxes = await db.query.mailboxes.findMany({
      where: eq(mailboxes.organizationId, userWithOrg.organization.id),
      columns: {
        id: true,
        emailAddress: true
      }
    })

    const results: DNSValidationResult[] = []

    for (const mailbox of orgMailboxes) {
      const domain = mailbox.emailAddress.split('@')[1]
      const dnsRecords: DNSValidationResult = {
        email: mailbox.emailAddress,
        domain,
        spf: { type: 'SPF', record: '', status: 'not_found' },
        dkim: { type: 'DKIM', record: '', status: 'not_found' },
        dmarc: { type: 'DMARC', record: '', status: 'not_found' }
      }

      try {
        // Check SPF record
        const spfRecords = await resolveTxt(domain)
        const spfRecord = spfRecords.flat().find(record => record.toLowerCase().startsWith('v=spf1'))
        if (spfRecord) {
          dnsRecords.spf = {
            type: 'SPF',
            record: spfRecord,
            status: 'valid'
          }
        }

        // Check DMARC record
        const dmarcDomain = `_dmarc.${domain}`
        const dmarcRecords = await resolveTxt(dmarcDomain)
        const dmarcRecord = dmarcRecords.flat().join('').toLowerCase()
        if (dmarcRecord.startsWith('v=dmarc1')) {
          dnsRecords.dmarc = {
            type: 'DMARC',
            record: dmarcRecord,
            status: 'valid'
          }
        }

        // Update mailbox DNS status
        const allValid = [dnsRecords.spf, dnsRecords.dmarc]
          .every(record => record.status === 'valid')

        await db.update(mailboxes)
          .set({
            dnsStatus: allValid ? 'valid' : 'invalid',
            dnsRecords: dnsRecords
          })
          .where(eq(mailboxes.id, mailbox.id))

      } catch (error) {
        console.error(`Error checking DNS for ${domain}:`, error)
      }

      results.push(dnsRecords)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error validating DNS:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 