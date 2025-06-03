'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Icon } from '@/components/ui/icon'
import { CheckCircle2, XCircle, AlertCircle, Loader2, Mail, Shield, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface DNSRecord {
  type: 'SPF' | 'DMARC'
  status: 'valid' | 'invalid' | 'missing'
  value: string
  description: string
}

interface Mailbox {
  id: number
  emailAddress: string
  provider: string
  domain: string
}

export default function DNSSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<Mailbox | null>(null)
  const [records, setRecords] = useState<DNSRecord[]>([])

  useEffect(() => {
    loadMailboxes()
  }, [])

  const loadMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes')
      if (!response.ok) throw new Error('Failed to load mailboxes')
      const data = await response.json()
      setMailboxes(data)
      if (data.length > 0) {
        setSelectedMailbox(data[0])
        await checkDNSRecords(data[0])
      }
    } catch (error) {
      console.error('Error loading mailboxes:', error)
      toast.error('Failed to load mailboxes')
    } finally {
      setIsLoading(false)
    }
  }

  const checkDNSRecords = async (mailbox: Mailbox) => {
    try {
      setIsLoading(true)
      const domain = mailbox.emailAddress.split('@')[1]
      const response = await fetch('/api/dns/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
      if (!response.ok) throw new Error('Failed to check DNS records')
      const data = await response.json()
      setRecords(data.records.filter((r: { type: string }) => r.type === 'SPF' || r.type === 'DMARC'))
    } catch (error) {
      console.error('Error checking DNS records:', error)
      toast.error('Failed to check DNS records')
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: DNSRecord['status']) => {
    switch (status) {
      case 'valid':
        return <Icon icon={CheckCircle2} className="h-5 w-5 text-green-500" />
      case 'invalid':
        return <Icon icon={XCircle} className="h-5 w-5 text-red-500" />
      case 'missing':
        return <Icon icon={AlertCircle} className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: DNSRecord['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default">Valid</Badge>
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>
      case 'missing':
        return <Badge variant="secondary">Missing</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-5xl py-8">
        <div className="flex items-center justify-center py-8">
          <Icon icon={Loader2} className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings/mailboxes">
              <Icon icon={ArrowLeft} className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">DNS Settings</h1>
        </div>
      </div>

      {mailboxes.length === 0 ? (
        <Alert>
          <Icon icon={Mail} className="h-4 w-4" />
          <AlertTitle>No Mailboxes Found</AlertTitle>
          <AlertDescription>
            Add a mailbox first to manage DNS settings.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <Tabs 
            defaultValue={mailboxes[0].id.toString()}
            onValueChange={(value) => {
              const mailbox = mailboxes.find(m => m.id.toString() === value)
              if (mailbox) {
                setSelectedMailbox(mailbox)
                checkDNSRecords(mailbox)
              }
            }}
          >
            <TabsList className="w-full border-b pb-0">
              {mailboxes.map((mailbox) => (
                <TabsTrigger
                  key={mailbox.id}
                  value={mailbox.id.toString()}
                  className="data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  {mailbox.emailAddress}
                </TabsTrigger>
              ))}
            </TabsList>

            {mailboxes.map((mailbox) => (
              <TabsContent key={mailbox.id} value={mailbox.id.toString()}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon icon={Shield} className="h-5 w-5" />
                      DNS Records for {mailbox.emailAddress}
                    </CardTitle>
                    <CardDescription>
                      Verify and manage email authentication records for your domain
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">
                            Domain: {mailbox.emailAddress.split('@')[1]}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Last checked: {new Date().toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => checkDNSRecords(mailbox)}
                        >
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
                          <Icon icon={AlertCircle} className="h-4 w-4" />
                          <AlertTitle>Action Required</AlertTitle>
                          <AlertDescription>
                            Some DNS records need to be updated to ensure optimal email deliverability.
                            Please update the records marked as invalid or missing.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  )
} 