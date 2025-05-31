'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DNSRecord {
  type: 'SPF' | 'DKIM' | 'DMARC'
  status: 'valid' | 'invalid' | 'missing'
  value: string
  description: string
}

export default function DNSRecordsPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true)
  const [records, setRecords] = useState<DNSRecord[]>([])
  const [domain, setDomain] = useState('')

  useEffect(() => {
    checkDNSRecords()
  }, [params.id])

  const checkDNSRecords = async () => {
    try {
      setIsLoading(true)
      // TODO: Implement DNS records checking
      // This is a mock response
      setRecords([
        {
          type: 'SPF',
          status: 'valid',
          value: 'v=spf1 include:_spf.google.com ~all',
          description: 'SPF record is properly configured'
        },
        {
          type: 'DKIM',
          status: 'invalid',
          value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
          description: 'DKIM record needs to be updated'
        },
        {
          type: 'DMARC',
          status: 'missing',
          value: '',
          description: 'DMARC record is not configured'
        }
      ])
      setDomain('example.com')
    } catch (error) {
      toast.error('Failed to check DNS records')
      console.error('DNS check error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: DNSRecord['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'invalid':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'missing':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: DNSRecord['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="success">Valid</Badge>
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>
      case 'missing':
        return <Badge variant="warning">Missing</Badge>
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>DNS Records Check</CardTitle>
          <CardDescription>
            Verify your domain's email authentication records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Domain: {domain}</h3>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {new Date().toLocaleString()}
                  </p>
                </div>
                <Button onClick={checkDNSRecords} variant="outline">
                  Recheck Records
                </Button>
              </div>

              <div className="space-y-4">
                {records.map((record) => (
                  <Card key={record.type}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            <h4 className="font-medium">{record.type} Record</h4>
                            {getStatusBadge(record.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {record.description}
                          </p>
                        </div>
                      </div>
                      {record.value && (
                        <div className="mt-4 rounded-md bg-muted p-3">
                          <code className="text-sm">{record.value}</code>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {records.some(r => r.status !== 'valid') && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Some DNS records need to be updated to ensure optimal email deliverability.
                    Please update the records marked as invalid or missing.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 