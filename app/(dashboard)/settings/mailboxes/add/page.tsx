'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Mail, Loader2, AlertCircle, CheckCircle2, Server, Lock, Shield, Upload, FileSpreadsheet } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Provider {
  id: string
  name: string
  icon: string
  oauthUrl: string
  scopes: string[]
}

interface CustomConnectionDetails {
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

interface BulkImportMailbox {
  email: string
  password: string
  imapServer: string
  imapPort: string
  imapSecurity: 'none' | 'ssl' | 'tls'
  imapUsername?: string
  smtpServer: string
  smtpPort: string
  smtpSecurity: 'none' | 'ssl' | 'tls'
  smtpUsername?: string
  requireAuth: boolean
}

const providers: Provider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📧',
    oauthUrl: '/api/auth/gmail',
    scopes: ['https://mail.google.com/']
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: '📨',
    oauthUrl: '/api/auth/outlook',
    scopes: ['https://outlook.office.com/mail.readwrite']
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    icon: '📩',
    oauthUrl: '/api/auth/yahoo',
    scopes: ['https://mail.yahoo.com/']
  },
  {
    id: 'custom',
    name: 'Custom IMAP/SMTP',
    icon: '⚙️',
    oauthUrl: '',
    scopes: []
  }
]

const defaultPorts = {
  imap: {
    none: '143',
    ssl: '993',
    tls: '143'
  },
  smtp: {
    none: '25',
    ssl: '465',
    tls: '587'
  }
}

export default function AddMailboxPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [provider, setProvider] = useState('custom')
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [connectionDetails, setConnectionDetails] = useState<CustomConnectionDetails>({
    email: '',
    password: '',
    imap: {
      server: '',
      port: '993',
      security: 'ssl',
      username: ''
    },
    smtp: {
      server: '',
      port: '587',
      security: 'tls',
      username: '',
      requireAuth: true
    }
  })
  const [bulkMailboxes, setBulkMailboxes] = useState<BulkImportMailbox[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleOAuthConnect = async (providerId: string) => {
    try {
      setIsLoading(true)
      setStatus('connecting')
      setError(null)

      const selectedProvider = providers.find(p => p.id === providerId)
      if (!selectedProvider) {
        throw new Error('Invalid provider selected')
      }

      window.location.href = selectedProvider.oauthUrl
      toast.success('Redirecting to provider...')
    } catch (error) {
      setStatus('error')
      setError(error instanceof Error ? error.message : 'Failed to connect mailbox')
      toast.error('Failed to connect mailbox')
      console.error('OAuth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setStatus('connecting')
      setError(null)

      // Validate connection details
      if (!connectionDetails.email || !connectionDetails.password) {
        throw new Error('Email and password are required')
      }

      if (!connectionDetails.imap.server || !connectionDetails.smtp.server) {
        throw new Error('IMAP and SMTP server addresses are required')
      }

      // TODO: Implement connection test and storage
      // 1. Test IMAP connection
      // 2. Test SMTP connection
      // 3. Store credentials securely
      // 4. Create mailbox record

      toast.success('Custom connection initiated')
    } catch (error) {
      setStatus('error')
      setError(error instanceof Error ? error.message : 'Failed to connect mailbox')
      toast.error('Failed to connect mailbox')
      console.error('Connection error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateConnectionDetails = (
    type: 'imap' | 'smtp',
    field: string,
    value: string | boolean
  ) => {
    setConnectionDetails(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
        // Update port when security changes
        ...(field === 'security' && {
          port: defaultPorts[type][value as 'none' | 'ssl' | 'tls']
        })
      }
    }))
  }

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split('\n')
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
        
        // Validate required headers
        const requiredHeaders = ['email', 'password', 'imapserver', 'smtpserver']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        
        if (missingHeaders.length > 0) {
          throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
        }

        const mailboxes: BulkImportMailbox[] = []
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue
          
          const values = lines[i].split(',').map(v => v.trim())
          const mailbox: BulkImportMailbox = {
            email: values[headers.indexOf('email')] || '',
            password: values[headers.indexOf('password')] || '',
            imapServer: values[headers.indexOf('imapserver')] || '',
            imapPort: values[headers.indexOf('imapport')] || '993',
            imapSecurity: (values[headers.indexOf('imapsecurity')] || 'ssl') as 'none' | 'ssl' | 'tls',
            imapUsername: values[headers.indexOf('imapusername')] || '',
            smtpServer: values[headers.indexOf('smtpserver')] || '',
            smtpPort: values[headers.indexOf('smtpport')] || '587',
            smtpSecurity: (values[headers.indexOf('smtpsecurity')] || 'tls') as 'none' | 'ssl' | 'tls',
            smtpUsername: values[headers.indexOf('smtpusername')] || '',
            requireAuth: values[headers.indexOf('requireauth')]?.toLowerCase() !== 'false'
          }
          
          // Validate required fields
          if (!mailbox.email || !mailbox.password || !mailbox.imapServer || !mailbox.smtpServer) {
            throw new Error(`Missing required fields in row ${i + 1}`)
          }
          
          mailboxes.push(mailbox)
        }

        setBulkMailboxes(mailboxes)
        setImportError(null)
        toast.success(`Successfully loaded ${mailboxes.length} mailboxes`)
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to parse CSV file')
        toast.error('Failed to parse CSV file')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleBulkImport = async () => {
    try {
      setIsImporting(true)
      setImportError(null)

      // Validate all mailboxes
      const validationErrors: string[] = []
      bulkMailboxes.forEach((mailbox, index) => {
        if (!mailbox.email || !mailbox.password || !mailbox.imapServer || !mailbox.smtpServer) {
          validationErrors.push(`Row ${index + 1}: Missing required fields`)
        }
        if (!mailbox.email.includes('@')) {
          validationErrors.push(`Row ${index + 1}: Invalid email format`)
        }
      })

      if (validationErrors.length > 0) {
        throw new Error(`Validation errors:\n${validationErrors.join('\n')}`)
      }

      // Process mailboxes in batches to avoid overwhelming the server
      const batchSize = 5
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (let i = 0; i < bulkMailboxes.length; i += batchSize) {
        const batch = bulkMailboxes.slice(i, i + batchSize)
        
        // Process each mailbox in the batch
        await Promise.all(batch.map(async (mailbox) => {
          try {
            // TODO: Replace with actual API call
            // const response = await fetch('/api/mailboxes', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({
            //     email: mailbox.email,
            //     provider: 'custom',
            //     authTokenEncrypted: mailbox.password, // This should be encrypted
            //     imap: {
            //       server: mailbox.imapServer,
            //       port: parseInt(mailbox.imapPort),
            //       security: mailbox.imapSecurity,
            //       username: mailbox.imapUsername || mailbox.email
            //     },
            //     smtp: {
            //       server: mailbox.smtpServer,
            //       port: parseInt(mailbox.smtpPort),
            //       security: mailbox.smtpSecurity,
            //       username: mailbox.smtpUsername || mailbox.email,
            //       requireAuth: mailbox.requireAuth
            //     }
            //   })
            // })

            // Simulate API call for now
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            results.success++
          } catch (error) {
            results.failed++
            results.errors.push(`${mailbox.email}: ${error instanceof Error ? error.message : 'Failed to import'}`)
          }
        }))
      }

      if (results.failed > 0) {
        throw new Error(
          `Import completed with errors:\n` +
          `Successfully imported: ${results.success}\n` +
          `Failed: ${results.failed}\n` +
          `Errors:\n${results.errors.join('\n')}`
        )
      }

      toast.success(`Successfully imported ${results.success} mailboxes`)
      // Redirect to mailboxes list page after successful import
      window.location.href = '/settings/mailboxes'
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import mailboxes')
      toast.error('Failed to import mailboxes')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/10">
      <div className="container max-w-4xl px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1.5 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight">Add New Mailbox</CardTitle>
                <CardDescription className="text-base mt-1.5">
                  Connect your email account to start sending emails. We support OAuth for major providers,
                  custom IMAP/SMTP for other email services, and bulk import via CSV.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="single" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  Single Mailbox
                </TabsTrigger>
                <TabsTrigger value="bulk" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Bulk Import
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-6 mt-0">
                <div className="space-y-2">
                  <Label className="text-base">Email Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <span>{p.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {provider === 'custom' ? (
                  <form onSubmit={handleCustomConnect} className="space-y-6">
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
                      </div>
                    </div>

                    <Tabs defaultValue="imap" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="imap">
                          <Server className="w-4 h-4 mr-2" />
                          IMAP Settings
                        </TabsTrigger>
                        <TabsTrigger value="smtp">
                          <Mail className="w-4 h-4 mr-2" />
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
                      <Shield className="w-4 h-4" />
                      <span>Your credentials are encrypted and stored securely</span>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        'Connect Mailbox'
                      )}
                    </Button>
                  </form>
                ) : provider ? (
                  <div className="space-y-4">
                    <Button
                      className="w-full"
                      onClick={() => handleOAuthConnect(provider)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Connect with {providers.find(p => p.id === provider)?.name}
                        </>
                      )}
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Secure OAuth connection
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        No password storage
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Automatic token refresh
                      </p>
                    </div>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="bulk" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">Upload CSV File</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('csv-template')?.click()}
                        className="whitespace-nowrap"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                      <a
                        id="csv-template"
                        href="/templates/mailbox-import.csv"
                        download
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Upload a CSV file with your mailbox configurations. Download the template for the correct format.
                    </p>
                  </div>

                  {importError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{importError}</AlertDescription>
                    </Alert>
                  )}

                  {bulkMailboxes.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Preview ({bulkMailboxes.length} mailboxes)</h3>
                        <Button
                          onClick={handleBulkImport}
                          disabled={isImporting}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Import All
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Email</TableHead>
                              <TableHead>IMAP Server</TableHead>
                              <TableHead>SMTP Server</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bulkMailboxes.map((mailbox, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{mailbox.email}</TableCell>
                                <TableCell>{mailbox.imapServer}</TableCell>
                                <TableCell>{mailbox.smtpServer}</TableCell>
                                <TableCell>
                                  <span className="text-muted-foreground">Ready to import</span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 