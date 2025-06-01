import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icon } from '@/components/ui/icon'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface EmailSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  mailbox: {
    id: number
    emailAddress: string
    provider: string
    status: 'active' | 'warning' | 'error'
    dailyLimit: number
    warmUpStatus: 'active' | 'inactive' | 'completed'
  }
  onSave: (settings: {
    status: 'active' | 'warning' | 'error'
    dailyLimit: number
    warmUpStatus: 'active' | 'inactive' | 'completed'
  }) => Promise<void>
}

export function EmailSettingsDialog({ isOpen, onClose, mailbox, onSave }: EmailSettingsDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    status: mailbox.status,
    dailyLimit: mailbox.dailyLimit,
    warmUpStatus: mailbox.warmUpStatus
  })

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onSave(settings)
      toast.success('Email settings updated successfully')
      onClose()
    } catch (error) {
      console.error('Error saving email settings:', error)
      toast.error('Failed to update email settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Email Settings</DialogTitle>
          <DialogDescription>
            Configure settings for {mailbox.emailAddress}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={settings.status}
              onValueChange={(value) => setSettings(s => ({ ...s, status: value as 'active' | 'warning' | 'error' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Daily Email Limit</Label>
            <Input
              type="number"
              min="1"
              max="10000"
              value={settings.dailyLimit}
              onChange={(e) => setSettings(s => ({ ...s, dailyLimit: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of emails that can be sent per day
            </p>
          </div>

          <div className="space-y-2">
            <Label>Warm-up Status</Label>
            <Select
              value={settings.warmUpStatus}
              onValueChange={(value) => setSettings(s => ({ ...s, warmUpStatus: value as 'active' | 'inactive' | 'completed' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Control the warm-up process for this mailbox
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
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
      </DialogContent>
    </Dialog>
  )
} 