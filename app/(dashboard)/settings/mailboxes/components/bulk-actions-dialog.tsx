'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/icon'
import { Settings } from 'lucide-react'

interface BulkWarmupConfig {
  daysOfWeek: number[]
  startTime: string
  endTime: string
}

interface BulkCampaignConfig {
  maxDailyEmails: number
  enableSignature: boolean
  enableTracking: boolean
}

interface BulkActionsDialogProps {
  selectedCount: number
  onWarmup: (config: BulkWarmupConfig) => Promise<void>
  onCampaign: (config: BulkCampaignConfig) => Promise<void>
  onTracking: (domain: string) => Promise<void>
  onDelete: () => Promise<void>
}

export function BulkActionsDialog({
  selectedCount,
  onWarmup,
  onCampaign,
  onTracking,
  onDelete,
}: BulkActionsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [action, setAction] = useState<'warmup' | 'campaign' | 'tracking' | 'delete'>('warmup')
  const [isLoading, setIsLoading] = useState(false)

  // Warmup config
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  // Campaign config
  const [maxDailyEmails, setMaxDailyEmails] = useState(100)
  const [enableSignature, setEnableSignature] = useState(true)
  const [enableTracking, setEnableTracking] = useState(true)

  // Tracking config
  const [trackingDomain, setTrackingDomain] = useState('')

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      switch (action) {
        case 'warmup':
          await onWarmup({ daysOfWeek, startTime, endTime })
          break
        case 'campaign':
          await onCampaign({ maxDailyEmails, enableSignature, enableTracking })
          break
        case 'tracking':
          if (!trackingDomain) {
            toast.error('Please enter a tracking domain')
            return
          }
          await onTracking(trackingDomain)
          break
        case 'delete':
          if (!confirm('Are you sure you want to delete these mailboxes? This action cannot be undone.')) {
            return
          }
          await onDelete()
          break
      }

      setIsOpen(false)
      toast.success('Bulk action completed successfully')
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast.error('Failed to perform bulk action')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={selectedCount === 0}>
          <Icon icon={Settings} className="h-4 w-4 mr-2" />
          Bulk Actions ({selectedCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="action" className="text-right">
              Action
            </Label>
            <select
              id="action"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
            >
              <option value="warmup">Warmup Config</option>
              <option value="campaign">Campaign Config</option>
              <option value="tracking">Tracking Domain</option>
              <option value="delete">Delete Mailboxes</option>
            </select>
          </div>

          {action === 'warmup' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="days" className="text-right">
                  Days
                </Label>
                <div className="col-span-3 flex gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <Button
                      key={day}
                      variant={daysOfWeek.includes(index + 1) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setDaysOfWeek(prev =>
                          prev.includes(index + 1)
                            ? prev.filter(d => d !== index + 1)
                            : [...prev, index + 1]
                        )
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startTime" className="text-right">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endTime" className="text-right">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </>
          )}

          {action === 'campaign' && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxDailyEmails" className="text-right">
                  Max Daily Emails
                </Label>
                <Input
                  id="maxDailyEmails"
                  type="number"
                  value={maxDailyEmails}
                  onChange={(e) => setMaxDailyEmails(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="enableSignature" className="text-right">
                  Enable Signature
                </Label>
                <Switch
                  id="enableSignature"
                  checked={enableSignature}
                  onCheckedChange={setEnableSignature}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="enableTracking" className="text-right">
                  Enable Tracking
                </Label>
                <Switch
                  id="enableTracking"
                  checked={enableTracking}
                  onCheckedChange={setEnableTracking}
                  className="col-span-3"
                />
              </div>
            </>
          )}

          {action === 'tracking' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trackingDomain" className="text-right">
                Tracking Domain
              </Label>
              <Input
                id="trackingDomain"
                value={trackingDomain}
                onChange={(e) => setTrackingDomain(e.target.value)}
                placeholder="e.g. track.example.com"
                className="col-span-3"
              />
            </div>
          )}

          {action === 'delete' && (
            <div className="text-sm text-muted-foreground">
              This will permanently delete {selectedCount} selected mailboxes. This action cannot be undone.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 