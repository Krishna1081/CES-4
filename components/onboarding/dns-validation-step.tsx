'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw, Shield } from 'lucide-react'

interface DnsValidationStepProps {
  domain: string
  onNext: () => void
  onBack: () => void
}

interface DnsRecord {
  type: 'SPF' | 'DMARC'
  status: 'valid' | 'invalid' | 'missing' | 'checking'
  value?: string
  expectedValue?: string
  description: string
}

function DnsValidationStep({ domain, onNext, onBack }: DnsValidationStepProps) {
  const [records, setRecords] = useState<DnsRecord[]>([
    {
      type: 'SPF',
      status: 'checking',
      description: 'Specifies which servers can send emails for your domain',
    },
    {
      type: 'DMARC',
      status: 'checking',
      description: 'Defines how to handle emails that fail SPF checks',
    },
  ])
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    checkDnsRecords()
  }, [domain])

  const checkDnsRecords = async () => {
    setIsChecking(true)
    
    try {
      const response = await fetch('/api/dns/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      if (response.ok) {
        const result = await response.json()
        // Filter out any DKIM records if they exist
        setRecords(result.records.filter((r: { type: string }) => r.type === 'SPF' || r.type === 'DMARC'))
      } else {
        // Simulate results for demo
        setTimeout(() => {
          setRecords([
            {
              type: 'SPF',
              status: 'valid',
              value: 'v=spf1 include:_spf.google.com ~all',
              description: 'Specifies which servers can send emails for your domain',
            },
            {
              type: 'DMARC',
              status: 'missing',
              expectedValue: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
              description: 'Defines how to handle emails that fail SPF checks',
            },
          ])
        }, 2000)
      }
    } catch (error) {
      console.error('DNS validation error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusIcon = (status: DnsRecord['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'invalid':
      case 'missing':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'checking':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
    }
  }

  const getStatusText = (status: DnsRecord['status']) => {
    switch (status) {
      case 'valid':
        return 'Valid'
      case 'invalid':
        return 'Invalid'
      case 'missing':
        return 'Missing'
      case 'checking':
        return 'Checking...'
    }
  }

  const getStatusColor = (status: DnsRecord['status']) => {
    switch (status) {
      case 'valid':
        return 'text-green-600'
      case 'invalid':
      case 'missing':
        return 'text-red-600'
      case 'checking':
        return 'text-blue-600'
    }
  }

  const allRecordsValid = records.every(record => record.status === 'valid')
  const hasIssues = records.some(record => record.status === 'invalid' || record.status === 'missing')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Domain DNS Validation
        </CardTitle>
        <CardDescription>
          We're checking your domain's DNS records to ensure optimal email deliverability.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Domain: {domain}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={checkDnsRecords}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Recheck
            </Button>
          </div>

          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.type}
                className="flex items-start space-x-3 rounded-lg border p-4"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(record.status)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{record.type}</span>
                    <span className={`text-sm font-medium ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{record.description}</p>
                  
                  {record.value && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Current value:</p>
                      <code className="text-xs bg-gray-100 p-1 rounded break-all">
                        {record.value}
                      </code>
                    </div>
                  )}
                  
                  {record.expectedValue && record.status !== 'valid' && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Expected value:</p>
                      <code className="text-xs bg-yellow-50 p-1 rounded break-all">
                        {record.expectedValue}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {allRecordsValid && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Excellent!</strong> All DNS records are properly configured. 
              Your emails will have optimal deliverability.
            </AlertDescription>
          </Alert>
        )}

        {hasIssues && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>DNS Issues Found:</strong> Some records need attention. 
              You can continue setup and fix these later, but we recommend 
              addressing them for better email deliverability.
              <br />
              <a
                href="https://docs.example.com/dns-setup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-yellow-700 underline hover:text-yellow-800 mt-2"
              >
                View DNS Setup Guide <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { DnsValidationStep } 