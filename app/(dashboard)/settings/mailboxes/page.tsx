'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Mail, Plus, Settings, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Mailbox {
  id: string
  email: string
  provider: string
  status: 'active' | 'warning' | 'error'
  lastChecked: string
  dailyLimit: number
  warmUpStatus: 'active' | 'inactive' | 'completed'
}

export default function MailboxesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])

  // Mock data - replace with actual API call
  useState(() => {
    setMailboxes([
      {
        id: '1',
        email: 'john@example.com',
        provider: 'Gmail',
        status: 'active',
        lastChecked: new Date().toISOString(),
        dailyLimit: 100,
        warmUpStatus: 'active'
      },
      {
        id: '2',
        email: 'support@example.com',
        provider: 'Custom SMTP',
        status: 'warning',
        lastChecked: new Date().toISOString(),
        dailyLimit: 50,
        warmUpStatus: 'inactive'
      }
    ])
    setIsLoading(false)
  })

  const getStatusBadge = (status: Mailbox['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
      case 'warning':
        return <Badge variant="destructive" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Warning</Badge>
      case 'error':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Error</Badge>
    }
  }

  const getWarmUpBadge = (status: Mailbox['warmUpStatus']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Warming Up</Badge>
      case 'inactive':
        return <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground">Not Started</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Completed</Badge>
    }
  }

  const getStatusIcon = (status: Mailbox['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  return (
    <div className="container max-w-7xl py-10 mx-auto">
      <div className="mb-10 flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight">Mailboxes</h1>
        <p className="text-lg text-muted-foreground">
          Manage your connected email accounts
        </p>
        <Link href="/settings/mailboxes/add" className="mt-6">
          <Button size="lg" className="h-12 px-6">
            <Plus className="mr-2 h-5 w-5" />
            Add Mailbox
          </Button>
        </Link>
      </div>

      <div className="space-y-6 max-w-4xl mx-auto">
        {mailboxes.map((mailbox) => (
          <Card key={mailbox.id} className="group relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(mailbox.status)}
                    <h3 className="text-lg font-medium">{mailbox.email}</h3>
                    <div className="flex gap-2">
                      {getStatusBadge(mailbox.status)}
                      {getWarmUpBadge(mailbox.warmUpStatus)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provider: {mailbox.provider} • Daily Limit: {mailbox.dailyLimit} emails
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/settings/mailboxes/${mailbox.id}/dns`}>
                    <Button variant="outline" size="sm" className="h-9">
                      DNS Records
                    </Button>
                  </Link>
                  <Link href={`/settings/mailboxes/${mailbox.id}`}>
                    <Button variant="outline" size="sm" className="h-9">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-transparent transition-all duration-200 group-hover:ring-primary/20" />
          </Card>
        ))}

        {mailboxes.length === 0 && !isLoading && (
          <Card className="relative overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mt-6 text-xl font-medium">No Mailboxes Connected</h3>
              <p className="mt-2 text-center text-base text-muted-foreground">
                Connect your first email account to start sending emails
              </p>
              <Link href="/settings/mailboxes/add" className="mt-6">
                <Button size="lg" className="h-12 px-6">
                  <Plus className="mr-2 h-5 w-5" />
                  Add Mailbox
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {mailboxes.some(m => m.status !== 'active') && (
          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-500">Attention Required</AlertTitle>
            <AlertDescription className="text-yellow-500/80">
              Some mailboxes need attention. Check their status and take necessary actions.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
} 