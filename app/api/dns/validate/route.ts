import { NextResponse } from 'next/server'
import { z } from 'zod'
import dns from 'dns'
import { promisify } from 'util'

const lookupTXT = promisify(dns.resolveTxt)

const schema = z.object({
  domain: z.string().min(1),
})

const generateSPFRecord = (domain: string) => {
  return `v=spf1 include:_spf.${domain} ~all`
}

const generateDKIMRecord = (domain: string) => {
  return `v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY`
}

const generateDMARCRecord = (domain: string) => {
  return `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { domain } = schema.parse(body)

    // SPF
    const spfRecords = await lookupTXT(domain)
    const spf = spfRecords.find(r => r.join('').toLowerCase().startsWith('v=spf1'))
    const spfStatus = spf ? 'valid' : 'missing'

    // DKIM (selector 'default' is common, but may need to be customized)
    const dkimSelector = 'default'
    const dkimDomain = `${dkimSelector}._domainkey.${domain}`
    let dkimStatus = 'missing'
    let dkimValue = ''
    try {
      const dkimRecords = await lookupTXT(dkimDomain)
      const dkim = dkimRecords.find(r => r.join('').toLowerCase().startsWith('v=dkim1'))
      if (dkim) {
        dkimStatus = 'valid'
        dkimValue = dkim.join('')
      }
    } catch (error) {
      // DKIM record not found
    }

    // DMARC
    const dmarcDomain = `_dmarc.${domain}`
    let dmarcStatus = 'missing'
    let dmarcValue = ''
    try {
      const dmarcRecords = await lookupTXT(dmarcDomain)
      const dmarc = dmarcRecords.find(r => r.join('').toLowerCase().startsWith('v=dmarc1'))
      if (dmarc) {
        dmarcStatus = 'valid'
        dmarcValue = dmarc.join('')
      }
    } catch (error) {
      // DMARC record not found
    }

    const records = [
      {
        type: 'SPF',
        status: spfStatus,
        value: spf ? spf.join('') : generateSPFRecord(domain),
        description: spfStatus === 'valid' 
          ? 'SPF record is properly configured'
          : 'Add this SPF record to authorize email sending'
      },
      {
        type: 'DKIM',
        status: dkimStatus,
        value: dkimValue || generateDKIMRecord(domain),
        description: dkimStatus === 'valid'
          ? 'DKIM record is properly configured'
          : 'Add this DKIM record to enable email signing'
      },
      {
        type: 'DMARC',
        status: dmarcStatus,
        value: dmarcValue || generateDMARCRecord(domain),
        description: dmarcStatus === 'valid'
          ? 'DMARC record is properly configured'
          : 'Add this DMARC record to protect against email spoofing'
      }
    ]

    return NextResponse.json({ records })
  } catch (error) {
    console.error('DNS validation error:', error)
    return NextResponse.json(
      { error: 'Invalid request or DNS lookup failed' },
      { status: 400 }
    )
  }
} 