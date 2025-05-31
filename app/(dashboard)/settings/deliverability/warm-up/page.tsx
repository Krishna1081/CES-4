'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function WarmUpSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [dailyLimit, setDailyLimit] = useState(5)
  const [rampUpDays, setRampUpDays] = useState(30)
  const [targetVolume, setTargetVolume] = useState(50)

  const handleSave = async () => {
    try {
      setIsLoading(true)
      // TODO: Implement warm-up settings save
      toast.success('Warm-up settings saved')
    } catch (error) {
      toast.error('Failed to save warm-up settings')
      console.error('Save error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Email Warm-up Settings</CardTitle>
          <CardDescription>
            Configure your email warm-up strategy to build sender reputation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Warm-up</Label>
                <p className="text-sm text-muted-foreground">
                  Gradually increase email volume to build sender reputation
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            {isEnabled && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Initial Daily Limit</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[dailyLimit]}
                        onValueChange={([value]) => setDailyLimit(value)}
                        min={1}
                        max={20}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(Number(e.target.value))}
                        className="w-20"
                        min={1}
                        max={20}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start with a small number of emails per day
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Ramp-up Period (Days)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[rampUpDays]}
                        onValueChange={([value]) => setRampUpDays(value)}
                        min={7}
                        max={90}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={rampUpDays}
                        onChange={(e) => setRampUpDays(Number(e.target.value))}
                        className="w-20"
                        min={7}
                        max={90}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gradually increase volume over this period
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Daily Volume</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[targetVolume]}
                        onValueChange={([value]) => setTargetVolume(value)}
                        min={20}
                        max={200}
                        step={5}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={targetVolume}
                        onChange={(e) => setTargetVolume(Number(e.target.value))}
                        className="w-20"
                        min={20}
                        max={200}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Maximum emails to send per day after warm-up
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 