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
import { Loader2, Clock, TrendingUp, ArrowLeft } from 'lucide-react'
import { TimePicker } from '@/components/ui/time-picker'
import { Checkbox } from '@/components/ui/checkbox'

interface WarmupSettings {
  enabled: boolean
  dailyLimit: number
  rampUpDays: number
  targetDailyVolume: number
  schedule: {
    enabled: boolean
    daysOfWeek: string[]
    startTime: string
    endTime: string
  }
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

export default function MailboxWarmupSettingsPage() {
  const router = useRouter()
  const params = useParams() as { id: string }
  const mailboxId = params.id
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<WarmupSettings>({
    enabled: false,
    dailyLimit: 5,
    rampUpDays: 30,
    targetDailyVolume: 50,
    schedule: {
      enabled: false,
      daysOfWeek: [],
      startTime: '09:00',
      endTime: '17:00'
    }
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/mailboxes/${mailboxId}/warmup`)
        if (!res.ok) throw new Error('Failed to fetch warmup settings')
        const data = await res.json()
        setSettings(data)
      } catch (err) {
        setError('Failed to load warm-up settings')
      } finally {
        setIsLoading(false)
      }
    }
    if (mailboxId) fetchSettings()
  }, [mailboxId])

  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/mailboxes/${mailboxId}/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error('Failed to save settings')
      toast.success('Warm-up settings saved successfully')
    } catch (err) {
      setError('Failed to save warm-up settings')
      toast.error('Failed to save warm-up settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDayToggle = (day: string) => {
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        daysOfWeek: prev.schedule.daysOfWeek.includes(day)
          ? prev.schedule.daysOfWeek.filter(d => d !== day)
          : [...prev.schedule.daysOfWeek, day]
      }
    }))
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
            <h1 className="text-3xl font-bold tracking-tight">Mailbox Warm-up Settings</h1>
            <p className="text-muted-foreground">
              Configure warm-up for this mailbox to improve deliverability
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        {/* Main Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Warm-up Configuration
            </CardTitle>
            <CardDescription>
              Set up the basic warm-up parameters for this mailbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Warm-up</Label>
                <p className="text-sm text-muted-foreground">
                  Start warming up this mailbox automatically
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={checked => setSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label>Initial Daily Limit</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.dailyLimit]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, dailyLimit: value }))}
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={settings.dailyLimit}
                    onChange={e => setSettings(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                    className="w-20"
                    min={1}
                    max={20}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Number of emails to send per day at the start
                </p>
              </div>
              <div>
                <Label>Ramp-up Period (Days)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.rampUpDays]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, rampUpDays: value }))}
                    min={7}
                    max={90}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={settings.rampUpDays}
                    onChange={e => setSettings(prev => ({ ...prev, rampUpDays: parseInt(e.target.value) }))}
                    className="w-20"
                    min={7}
                    max={90}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Number of days to reach target volume
                </p>
              </div>
              <div>
                <Label>Target Daily Volume</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.targetDailyVolume]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, targetDailyVolume: value }))}
                    min={20}
                    max={200}
                    step={5}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={settings.targetDailyVolume}
                    onChange={e => setSettings(prev => ({ ...prev, targetDailyVolume: parseInt(e.target.value) }))}
                    className="w-20"
                    min={20}
                    max={200}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum number of emails to send per day
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Schedule Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Settings
            </CardTitle>
            <CardDescription>
              Configure when warm-up emails should be sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  Send warm-up emails only during specific times
                </p>
              </div>
              <Switch
                checked={settings.schedule.enabled}
                onCheckedChange={checked => setSettings(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, enabled: checked }
                }))}
              />
            </div>
            {settings.schedule.enabled && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label>Days of Week</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={day}
                            checked={settings.schedule.daysOfWeek.includes(day)}
                            onCheckedChange={() => handleDayToggle(day)}
                          />
                          <label
                            htmlFor={day}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {day}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <TimePicker
                        value={settings.schedule.startTime}
                        onChange={time => setSettings(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, startTime: time }
                        }))}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <TimePicker
                        value={settings.schedule.endTime}
                        onChange={time => setSettings(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, endTime: time }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
} 