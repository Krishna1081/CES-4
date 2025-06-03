'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings2, Mail, AlertCircle, Loader2, Shield, Server } from 'lucide-react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { useRouter } from 'next/navigation'

interface Mailbox {
  id: number
  emailAddress: string
  provider: string
  status: 'active' | 'warning' | 'error'
  dailyLimit: number
  warmUpStatus: 'active' | 'inactive' | 'completed'
  authTokenEncrypted: string
  imap: {
    server: string
    port: number
    security: 'none' | 'ssl' | 'tls'
    username: string
  }
  smtp: {
    server: string
    port: number
    security: 'none' | 'ssl' | 'tls'
    username: string
    requireAuth: boolean
  }
}

interface ConnectionDetails {
  email: string
  password: string
  imap: {
    server: string
    port: string
    security: 'none' | 'ssl' | 'tls'
    username: string
  }
  smtp: {
    server: string
    port: string
    security: 'none' | 'ssl' | 'tls'
    username: string
    requireAuth: boolean
  }
}

export default function MailboxSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [mailbox, setMailbox] = useState<Mailbox | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
    email: '',
    password: '',
    imap: {
      server: '',
      port: '',
      security: 'ssl',
      username: ''
    },
    smtp: {
      server: '',
      port: '',
      security: 'ssl',
      username: '',
      requireAuth: true
    }
  })

  useEffect(() => {
    loadMailbox()
  }, [params.id])

  const loadMailbox = async () => {
    try {
      const response = await fetch(`/api/mailboxes/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch mailbox')
      const data = await response.json()
      setMailbox(data)
      
      // Set connection details from mailbox data
      setConnectionDetails({
        email: data.emailAddress,
        password: '', // Password is encrypted, so we don't show it
        imap: {
          server: data.imap.server,
          port: data.imap.port.toString(),
          security: data.imap.security,
          username: data.imap.username
        },
        smtp: {
          server: data.smtp.server,
          port: data.smtp.port.toString(),
          security: data.smtp.security,
          username: data.smtp.username,
          requireAuth: data.smtp.requireAuth
        }
      })
    } catch (error) {
      console.error('Error loading mailbox:', error)
      setError(error instanceof Error ? error.message : 'Failed to load mailbox')
      toast.error('Failed to load mailbox')
    } finally {
      setIsLoading(false)
    }
  }

  const updateConnectionDetails = (
    section: 'imap' | 'smtp',
    field: string,
    value: string | boolean
  ) => {
    setConnectionDetails(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSaving(true)
      setError(null)

      // Only encrypt password if it's been changed
      let authTokenEncrypted = mailbox?.authTokenEncrypted
      if (connectionDetails.password) {
        const encryptResponse = await fetch('/api/encrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: connectionDetails.password })
        })

        if (!encryptResponse.ok) {
          throw new Error('Failed to encrypt password')
        }

        const { encrypted } = await encryptResponse.json()
        authTokenEncrypted = encrypted
      }

      const response = await fetch(`/api/mailboxes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: connectionDetails.email,
          provider: mailbox?.provider || 'custom',
          authTokenEncrypted,
          status: mailbox?.status || 'active',
          dailyLimit: mailbox?.dailyLimit || 100,
          warmUpStatus: mailbox?.warmUpStatus || 'inactive',
          imap: {
            server: connectionDetails.imap.server,
            port: parseInt(connectionDetails.imap.port),
            security: connectionDetails.imap.security,
            username: connectionDetails.imap.username || connectionDetails.email
          },
          smtp: {
            server: connectionDetails.smtp.server,
            port: parseInt(connectionDetails.smtp.port),
            security: connectionDetails.smtp.security,
            username: connectionDetails.smtp.username || connectionDetails.email,
            requireAuth: connectionDetails.smtp.requireAuth
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update mailbox')
      }

      toast.success('Mailbox updated successfully')
      router.push('/settings/mailboxes')
    } catch (error) {
      console.error('Error updating mailbox:', error)
      setError(error instanceof Error ? error.message : 'Failed to update mailbox')
      toast.error('Failed to update mailbox')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!mailbox) {
    return (
      <div className="container max-w-4xl py-8 mx-auto">
        <Alert variant="destructive">
          <Icon icon={AlertCircle} className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load mailbox settings. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8 mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Mailbox Settings</CardTitle>
          <CardDescription>
            Configure settings for {mailbox.emailAddress}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <Icon icon={AlertCircle} className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={connectionDetails.email}
                  onChange={(e) => setConnectionDetails(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={connectionDetails.password}
                  onChange={(e) => setConnectionDetails(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Leave blank to keep the current password
                </p>
              </div>
            </div>

            <Tabs defaultValue="imap" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="imap">
                  <Icon icon={Server} className="w-4 h-4 mr-2" />
                  IMAP Settings
                </TabsTrigger>
                <TabsTrigger value="smtp">
                  <Icon icon={Mail} className="w-4 h-4 mr-2" />
                  SMTP Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="imap" className="space-y-4">
                <div className="space-y-2">
                  <Label>IMAP Server</Label>
                  <Input
                    type="text"
                    placeholder="imap.example.com"
                    value={connectionDetails.imap.server}
                    onChange={(e) => updateConnectionDetails('imap', 'server', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="text"
                      value={connectionDetails.imap.port}
                      onChange={(e) => updateConnectionDetails('imap', 'port', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Security</Label>
                    <Select
                      value={connectionDetails.imap.security}
                      onValueChange={(value) => updateConnectionDetails('imap', 'security', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="tls">TLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Username (if different from email)</Label>
                  <Input
                    type="text"
                    placeholder={connectionDetails.email}
                    value={connectionDetails.imap.username}
                    onChange={(e) => updateConnectionDetails('imap', 'username', e.target.value)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="smtp" className="space-y-4">
                <div className="space-y-2">
                  <Label>SMTP Server</Label>
                  <Input
                    type="text"
                    placeholder="smtp.example.com"
                    value={connectionDetails.smtp.server}
                    onChange={(e) => updateConnectionDetails('smtp', 'server', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="text"
                      value={connectionDetails.smtp.port}
                      onChange={(e) => updateConnectionDetails('smtp', 'port', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Security</Label>
                    <Select
                      value={connectionDetails.smtp.security}
                      onValueChange={(value) => updateConnectionDetails('smtp', 'security', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="tls">TLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Username (if different from email)</Label>
                  <Input
                    type="text"
                    placeholder={connectionDetails.email}
                    value={connectionDetails.smtp.username}
                    onChange={(e) => updateConnectionDetails('smtp', 'username', e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={connectionDetails.smtp.requireAuth}
                    onCheckedChange={(checked) => updateConnectionDetails('smtp', 'requireAuth', checked)}
                  />
                  <Label htmlFor="require-auth">Require authentication</Label>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon icon={Shield} className="w-4 h-4" />
              <span>Your credentials are encrypted and stored securely</span>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => router.push('/settings/mailboxes')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Icon icon={Loader2} className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 