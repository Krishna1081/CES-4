"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { Loader2, Mail, Shield, AlertTriangle, ArrowLeft } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CampaignConfig {
  maxDailyEmails: number
  enableSignature: boolean
  enableTracking: boolean
  replyToEmail: string
  customDomain: string
  bounceHandling: {
    enabled: boolean
    maxBounces: number
    action: 'pause' | 'notify' | 'none'
  }
  spamProtection: {
    enabled: boolean
    maxComplaints: number
    action: 'pause' | 'notify' | 'none'
  }
}

export default function MailboxCampaignConfigPage() {
  const router = useRouter()
  const params = useParams() as { id: string }
  const mailboxId = params.id
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<CampaignConfig>({
    maxDailyEmails: 100,
    enableSignature: true,
    enableTracking: true,
    replyToEmail: '',
    customDomain: '',
    bounceHandling: {
      enabled: true,
      maxBounces: 5,
      action: 'pause'
    },
    spamProtection: {
      enabled: true,
      maxComplaints: 3,
      action: 'pause'
    }
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/mailboxes/${mailboxId}/campaign-config`)
        if (!res.ok) throw new Error('Failed to fetch campaign config')
        const data = await res.json()
        setConfig(data)
      } catch (err) {
        setError('Failed to load campaign configuration')
      } finally {
        setIsLoading(false)
      }
    }
    if (mailboxId) fetchConfig()
  }, [mailboxId])

  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/mailboxes/${mailboxId}/campaign-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!response.ok) throw new Error('Failed to save config')
      toast.success('Campaign configuration saved successfully')
    } catch (err) {
      setError('Failed to save campaign configuration')
      toast.error('Failed to save campaign configuration')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/settings/mailboxes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Mailboxes
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaign Configuration</h1>
            <p className="text-muted-foreground">
              Configure campaign settings for this mailbox
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Basic Settings
            </CardTitle>
            <CardDescription>
              Configure basic campaign parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Maximum Daily Emails</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[config.maxDailyEmails]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, maxDailyEmails: value }))}
                    min={1}
                    max={1000}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={config.maxDailyEmails}
                    onChange={e => setConfig(prev => ({ ...prev, maxDailyEmails: parseInt(e.target.value) }))}
                    className="w-20"
                    min={1}
                    max={1000}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Signature</Label>
                  <p className="text-sm text-muted-foreground">
                    Add your signature to all campaign emails
                  </p>
                </div>
                <Switch
                  checked={config.enableSignature}
                  onCheckedChange={checked => setConfig(prev => ({ ...prev, enableSignature: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track opens and clicks in your campaigns
                  </p>
                </div>
                <Switch
                  checked={config.enableTracking}
                  onCheckedChange={checked => setConfig(prev => ({ ...prev, enableTracking: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bounce Handling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Bounce Handling
            </CardTitle>
            <CardDescription>
              Configure how to handle bounced emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Bounce Handling</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically handle bounced emails
                </p>
              </div>
              <Switch
                checked={config.bounceHandling.enabled}
                onCheckedChange={checked => setConfig(prev => ({
                  ...prev,
                  bounceHandling: { ...prev.bounceHandling, enabled: checked }
                }))}
              />
            </div>
            {config.bounceHandling.enabled && (
              <div className="space-y-4">
                <div>
                  <Label>Maximum Bounces</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.bounceHandling.maxBounces]}
                      onValueChange={([value]) => setConfig(prev => ({
                        ...prev,
                        bounceHandling: { ...prev.bounceHandling, maxBounces: value }
                      }))}
                      min={1}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={config.bounceHandling.maxBounces}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        bounceHandling: { ...prev.bounceHandling, maxBounces: parseInt(e.target.value) }
                      }))}
                      className="w-20"
                      min={1}
                      max={100}
                    />
                  </div>
                </div>
                <div>
                  <Label>Action on Limit</Label>
                  <Select
                    value={config.bounceHandling.action}
                    onValueChange={value => setConfig(prev => ({
                      ...prev,
                      bounceHandling: { ...prev.bounceHandling, action: value as 'pause' | 'notify' | 'none' }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pause">Pause Campaign</SelectItem>
                      <SelectItem value="notify">Send Notification</SelectItem>
                      <SelectItem value="none">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spam Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Spam Protection
            </CardTitle>
            <CardDescription>
              Configure spam protection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Spam Protection</Label>
                <p className="text-sm text-muted-foreground">
                  Monitor and handle spam complaints
                </p>
              </div>
              <Switch
                checked={config.spamProtection.enabled}
                onCheckedChange={checked => setConfig(prev => ({
                  ...prev,
                  spamProtection: { ...prev.spamProtection, enabled: checked }
                }))}
              />
            </div>
            {config.spamProtection.enabled && (
              <div className="space-y-4">
                <div>
                  <Label>Maximum Complaints</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.spamProtection.maxComplaints]}
                      onValueChange={([value]) => setConfig(prev => ({
                        ...prev,
                        spamProtection: { ...prev.spamProtection, maxComplaints: value }
                      }))}
                      min={1}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={config.spamProtection.maxComplaints}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        spamProtection: { ...prev.spamProtection, maxComplaints: parseInt(e.target.value) }
                      }))}
                      className="w-20"
                      min={1}
                      max={100}
                    />
                  </div>
                </div>
                <div>
                  <Label>Action on Limit</Label>
                  <Select
                    value={config.spamProtection.action}
                    onValueChange={value => setConfig(prev => ({
                      ...prev,
                      spamProtection: { ...prev.spamProtection, action: value as 'pause' | 'notify' | 'none' }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pause">Pause Campaign</SelectItem>
                      <SelectItem value="notify">Send Notification</SelectItem>
                      <SelectItem value="none">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
} 