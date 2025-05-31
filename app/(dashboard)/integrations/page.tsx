'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Settings, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Users,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Integration {
  id: string
  name: string
  type: 'crm' | 'email' | 'analytics'
  description: string
  logo: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing' | 'active' | 'inactive'
  lastSync?: Date
  features: string[]
  isPopular?: boolean
  authUrl?: string
  requiredScopes?: string[]
}

interface SyncSettings {
  syncContacts: boolean
  syncLeads: boolean
  syncDirection: 'bidirectional' | 'to_platform' | 'to_crm'
  autoSync: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily'
  filterByOwner: boolean
  selectedOwners: string[]
  customFieldMapping: boolean
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showSyncSettings, setShowSyncSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    syncContacts: true,
    syncLeads: true,
    syncDirection: 'bidirectional',
    autoSync: true,
    syncFrequency: 'hourly',
    filterByOwner: false,
    selectedOwners: [],
    customFieldMapping: false
  })

  // Fetch integrations from backend
  const { data: integrations, error: fetchError, isLoading } = useSWR<Integration[]>('/api/integrations', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })

  // Check for URL parameters (OAuth callback success/error)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const connectedProvider = urlParams.get('connected')
    const errorParam = urlParams.get('error')

    if (connectedProvider) {
      setSuccess(`Successfully connected to ${connectedProvider}!`)
      // Clear URL parameters
      window.history.replaceState({}, '', window.location.pathname)
      // Refresh integrations data
      mutate('/api/integrations')
    }

    if (errorParam) {
      setError(`Connection failed: ${errorParam}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleConnect = async (integration: Integration) => {
    setIsConnecting(true)
    setSelectedIntegration(integration)
    setError(null)
    
    try {
      // Initiate OAuth flow
      const response = await fetch(`/api/integrations/oauth/${integration.id}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth flow')
      }

      const { authUrl } = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = authUrl
    } catch (error) {
      console.error('OAuth initiation failed:', error)
      setError('Failed to initiate connection. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect integration')
      }

      setSuccess('Integration disconnected successfully')
      // Refresh integrations list
      await mutate('/api/integrations')
    } catch (error) {
      console.error('Disconnect failed:', error)
      setError('Failed to disconnect integration')
    }
  }

  const handleSync = async (integrationId: string) => {
    try {
      setError(null)
      
      // Update UI to show syncing state
      await mutate('/api/integrations')
      
      const response = await fetch(`/api/integrations/sync/${integrationId}`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Sync failed')
      }

      setSuccess(result.message)
      // Refresh integrations list and contacts
      await mutate('/api/integrations')
      await mutate('/api/contacts')
    } catch (error) {
      console.error('Sync failed:', error)
      setError(error instanceof Error ? error.message : 'Sync failed')
      await mutate('/api/integrations')
    }
  }

  const handleTestIntegration = async (integrationId: string) => {
    try {
      setError(null)
      
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: integrationId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Test failed')
      }

      setSuccess(result.message + ' (Test Mode)')
      // Refresh integrations list and contacts
      await mutate('/api/integrations')
      await mutate('/api/contacts')
    } catch (error) {
      console.error('Test failed:', error)
      setError(error instanceof Error ? error.message : 'Test failed')
    }
  }

  const saveSyncSettings = async () => {
    if (!selectedIntegration) return
    
    try {
      const response = await fetch(`/api/integrations/${selectedIntegration.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            syncSettings
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save sync settings')
      }

      setSuccess('Sync settings saved successfully')
      setShowSyncSettings(false)
      setSelectedIntegration(null)
      await mutate('/api/integrations')
    } catch (error) {
      console.error('Save failed:', error)
      setError('Failed to save sync settings')
    }
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'syncing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'syncing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Syncing</Badge>
      default:
        return <Badge variant="secondary">Not Connected</Badge>
    }
  }

  if (isConnecting && selectedIntegration) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Connecting to {selectedIntegration.name}</CardTitle>
            <CardDescription>
              Redirecting to {selectedIntegration.name} for authorization...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
              <p>Please complete the authorization in the popup window</p>
              <Button variant="outline" onClick={() => setIsConnecting(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showSyncSettings && selectedIntegration) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => setShowSyncSettings(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Configure {selectedIntegration.name} Sync
            </h1>
            <p className="text-muted-foreground">
              Set up how data should sync between platforms
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Options</CardTitle>
              <CardDescription>
                Choose what data to sync and how often
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sync Contacts</Label>
                    <p className="text-sm text-muted-foreground">
                      Import and sync contact records
                    </p>
                  </div>
                  <Switch
                    checked={syncSettings.syncContacts}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, syncContacts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sync Leads</Label>
                    <p className="text-sm text-muted-foreground">
                      Import and sync lead records
                    </p>
                  </div>
                  <Switch
                    checked={syncSettings.syncLeads}
                    onCheckedChange={(checked) => 
                      setSyncSettings(prev => ({ ...prev, syncLeads: checked }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Sync Direction</Label>
                <select
                  value={syncSettings.syncDirection}
                  onChange={(e) => setSyncSettings(prev => ({ 
                    ...prev, 
                    syncDirection: e.target.value as SyncSettings['syncDirection'] 
                  }))}
                  className="w-full mt-2 p-2 border rounded"
                >
                  <option value="bidirectional">Bidirectional (both ways)</option>
                  <option value="to_platform">CRM to Platform only</option>
                  <option value="to_crm">Platform to CRM only</option>
                </select>
              </div>

              <div>
                <Label>Sync Frequency</Label>
                <select
                  value={syncSettings.syncFrequency}
                  onChange={(e) => setSyncSettings(prev => ({ 
                    ...prev, 
                    syncFrequency: e.target.value as SyncSettings['syncFrequency'] 
                  }))}
                  className="w-full mt-2 p-2 border rounded"
                >
                  <option value="realtime">Real-time (webhook)</option>
                  <option value="hourly">Every hour</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync new and updated records
                  </p>
                </div>
                <Switch
                  checked={syncSettings.autoSync}
                  onCheckedChange={(checked) => 
                    setSyncSettings(prev => ({ ...prev, autoSync: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>
                Map CRM fields to platform fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground">CRM Email → Platform Email</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <Label>First Name</Label>
                    <p className="text-sm text-muted-foreground">CRM First Name → Platform First Name</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <Label>Company</Label>
                    <p className="text-sm text-muted-foreground">CRM Company → Platform Company Name</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={saveSyncSettings}>
              Save Configuration
            </Button>
            <Button variant="outline" onClick={() => setShowSyncSettings(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite tools to sync data automatically
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>CRM Integrations</CardTitle>
            <CardDescription>
              Connect your CRM to automatically sync contacts, leads, and deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading integrations...</p>
              </div>
            ) : fetchError ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-red-500" />
                <p>Failed to load integrations</p>
                <p className="text-sm">Please try refreshing the page</p>
              </div>
            ) : !integrations || integrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No integrations available</p>
                <p className="text-sm">Contact support to add more integrations</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {integrations.filter(i => i.type === 'crm').map((integration) => (
                  <Card key={integration.id} className="relative">
                    {integration.isPopular && (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500">
                        Popular
                      </Badge>
                    )}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{integration.logo}</div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(integration.status)}
                              {getStatusBadge(integration.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <CardDescription>{integration.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Features</h4>
                          <div className="flex flex-wrap gap-1">
                            {integration.features.map(feature => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {(integration.status === 'connected' || integration.status === 'active') && integration.lastSync && (
                          <div className="text-sm text-muted-foreground">
                            Last sync: {new Date(integration.lastSync).toLocaleString()}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {(integration.status === 'connected' || integration.status === 'active' || integration.status === 'syncing') ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedIntegration(integration)
                                  setShowSyncSettings(true)
                                }}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Configure
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleSync(integration.id)}
                                disabled={integration.status === 'syncing'}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${integration.status === 'syncing' ? 'animate-spin' : ''}`} />
                                Sync Now
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleTestIntegration(integration.id)}
                                disabled={integration.status === 'syncing'}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${integration.status === 'syncing' ? 'animate-spin' : ''}`} />
                                Test
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDisconnect(integration.id)}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => handleConnect(integration)}
                                disabled={isConnecting}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Connect
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleTestIntegration(integration.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Test Mode
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>
              Monitor the status of your active integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!integrations || integrations.filter(i => ['connected', 'active', 'syncing', 'error'].includes(i.status)).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active integrations</p>
                <p className="text-sm">Connect a CRM above to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {integrations.filter(i => ['connected', 'active', 'syncing', 'error'].includes(i.status)).map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{integration.logo}</div>
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {integration.lastSync 
                            ? `Last synced: ${new Date(integration.lastSync).toLocaleString()}`
                            : 'Never synced'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.status)}
                      {getStatusBadge(integration.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 