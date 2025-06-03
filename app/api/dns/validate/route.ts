import { NextResponse } from 'next/server'
import { z } from 'zod'
import dns from 'dns'
import { promisify } from 'util'

const lookupTXT = promisify(dns.resolveTxt)

const schema = z.object({
  domain: z.string().min(1),
})

const generateSPFRecord = (domain: string) => {
  return `v=spf1 include:_spf.${domain} include:spf.protection.outlook.com include:_spf.google.com ~all`
}

const generateDMARCRecord = (domain: string) => {
  return `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1; aspf=s; adkim=s`
}

interface DNSRecord {
  type: 'SPF' | 'DMARC'
  status: 'valid' | 'missing'
  value: string
  description: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { domain } = schema.parse(body)
    console.log('Validating domain:', domain)

    const records: DNSRecord[] = []

    // Check SPF
    try {
    const spfRecords = await lookupTXT(domain)
      console.log('SPF Records found:', spfRecords)
      const spf = spfRecords.flat().find(r => r.toLowerCase().startsWith('v=spf1'))
      console.log('Found SPF record:', spf)
      records.push({
        type: 'SPF',
        status: spf ? 'valid' : 'missing',
        value: spf || generateSPFRecord(domain),
        description: spf ? 'SPF record is properly configured' : 'Add this SPF record to authorize email sending'
      })
    } catch (error) {
      console.error('Error checking SPF:', error)
      records.push({
        type: 'SPF',
        status: 'missing',
        value: generateSPFRecord(domain),
        description: 'Add this SPF record to authorize email sending'
      })
    }

    // Check DMARC
    try {
    const dmarcDomain = `_dmarc.${domain}`
      console.log(`Checking DMARC for domain: ${dmarcDomain}`)
      const dmarcRecords = await lookupTXT(dmarcDomain)
      console.log('DMARC Records found:', dmarcRecords)
      // Handle the case where the record might be split across multiple strings
      const dmarc = dmarcRecords.flat().join('').toLowerCase()
      const hasValidDMARC = dmarc.startsWith('v=dmarc1')
      console.log('Found DMARC record:', dmarc, 'Valid:', hasValidDMARC)
      records.push({
        type: 'DMARC',
        status: hasValidDMARC ? 'valid' : 'missing',
        value: hasValidDMARC ? dmarc : generateDMARCRecord(domain),
        description: hasValidDMARC ? 'DMARC record is properly configured' : 'Add this DMARC record to protect against email spoofing'
      })
    } catch (error) {
      console.error('Error checking DMARC:', error)
      records.push({
        type: 'DMARC',
        status: 'missing',
        value: generateDMARCRecord(domain),
        description: 'Add this DMARC record to protect against email spoofing'
      })
    }

    const allRecordsValid = records.every(r => r.status === 'valid')
    console.log('Validation result:', {
      allRecordsValid,
      records
    })

    return NextResponse.json({
      records,
      allDomainsValid: allRecordsValid
    })
  } catch (error) {
    console.error('DNS validation error:', error)
    return NextResponse.json(
      { error: 'Invalid request or DNS lookup failed' },
      { status: 400 }
    )
  }
} 