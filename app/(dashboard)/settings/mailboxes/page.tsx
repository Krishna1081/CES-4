'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus, Shield, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MailboxesTable } from './components/mailboxes-table'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MailboxStats {
  sent: number
  replies: number
  saved: number
  received: number
  successRate: number
}

interface DNSRecord {
  type: string
  record: string
  status: 'valid' | 'invalid' | 'not_found'
}

interface DNSValidationResult {
  email: string
  domain: string
  spf: DNSRecord
  dkim: DNSRecord
  dmarc: DNSRecord
}

interface Mailbox {
  id: number
  emailAddress: string
  provider: string
  status: 'active' | 'warning' | 'error'
  dailyLimit: number
  warmUpStatus: 'active' | 'inactive' | 'completed'
  dnsStatus: 'valid' | 'invalid' | 'not_found'
  dnsRecords?: DNSValidationResult
  stats: MailboxStats
}

interface BulkWarmupConfig {
  maxEmails: number
  maxReplies: number
  schedule: {
    enabled: boolean
    daysOfWeek: string[]
    startTime: string
    endTime: string
  }
}

interface BulkCampaignConfig {
  maxDailyEmails: number
  enableSignature: boolean
  enableTracking: boolean
}

interface BulkTrackingConfig {
  domain: string
}

interface BulkDeleteConfig {
  // Empty interface for delete action
}

type BulkActionConfig = BulkWarmupConfig | BulkCampaignConfig | BulkTrackingConfig | BulkDeleteConfig

export default function MailboxesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMailboxes, setSelectedMailboxes] = useState<number[]>([])
  const [isValidatingDNS, setIsValidatingDNS] = useState(false)
  const [stats, setStats] = useState({
    active: 0,
    total: 0,
    allowed: 100 // This should come from user's plan
  })

  useEffect(() => {
    loadMailboxes()
  }, [])

  const loadMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes')
      if (!response.ok) throw new Error('Failed to fetch mailboxes')
      const data = await response.json()
      
      // Fetch stats for each mailbox and ensure proper typing
      const mailboxesWithStats = await Promise.all(
        data.map(async (mailbox: any) => {
          const statsResponse = await fetch(`/api/mailboxes/${mailbox.id}/stats`)
          if (!statsResponse.ok) throw new Error(`Failed to fetch stats for mailbox ${mailbox.id}`)
          const stats = await statsResponse.json()
          
          // Ensure proper typing of the mailbox data
          const typedMailbox: Mailbox = {
            id: mailbox.id,
            emailAddress: mailbox.emailAddress,
            provider: mailbox.provider,
            status: mailbox.status as 'active' | 'warning' | 'error',
            dailyLimit: mailbox.dailyLimit,
            warmUpStatus: mailbox.warmUpStatus as 'active' | 'inactive' | 'completed',
            dnsStatus: (mailbox.dnsStatus || 'not_found') as 'valid' | 'invalid' | 'not_found',
            stats
          }
          return typedMailbox
        })
      )
      
      setMailboxes(mailboxesWithStats)
      setStats({
        active: mailboxesWithStats.filter(m => m.status === 'active').length,
        total: mailboxesWithStats.length,
        allowed: 100 // This should come from user's plan
      })
    } catch (error) {
      console.error('Error fetching mailboxes:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch mailboxes')
      toast.error('Failed to fetch mailboxes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (mailboxId: number, newStatus: 'active' | 'error') => {
    try {
      // First get the current mailbox data
      const mailboxResponse = await fetch(`/api/mailboxes/${mailboxId}`)
      if (!mailboxResponse.ok) throw new Error('Failed to fetch mailbox')
      const mailboxData = await mailboxResponse.json()
      
      // Then update with all required fields
      const response = await fetch(`/api/mailboxes/${mailboxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mailboxData.emailAddress,
          provider: mailboxData.provider,
          status: newStatus,
          dailyLimit: mailboxData.dailyLimit,
          warmUpStatus: mailboxData.warmUpStatus,
          imap: mailboxData.imap,
          smtp: mailboxData.smtp
        })
      })
      
      if (!response.ok) throw new Error('Failed to update mailbox')
      
      // Update the local state with the new status while preserving other fields
      setMailboxes(prevMailboxes => 
        prevMailboxes.map(m => {
          if (m.id === mailboxId) {
            // Create a new mailbox object with the updated status
            const updatedMailbox: Mailbox = {
              id: m.id,
              emailAddress: m.emailAddress,
              provider: m.provider,
              status: newStatus,
              dailyLimit: m.dailyLimit,
              warmUpStatus: m.warmUpStatus,
              dnsStatus: m.dnsStatus,
              stats: m.stats
            }
            return updatedMailbox
          }
          return m
        })
      )
      toast.success(`Mailbox ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
    } catch (error) {
      console.error('Error updating mailbox:', error)
      throw error
    }
  }

  const handleDelete = async (mailboxId: number) => {
    try {
      const response = await fetch(`/api/mailboxes/${mailboxId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete mailbox')
      
      setMailboxes(mailboxes.filter(m => m.id !== mailboxId))
      toast.success('Mailbox deleted successfully')
    } catch (error) {
      console.error('Error deleting mailbox:', error)
      throw error
    }
  }

  const handleValidateDNS = async () => {
    try {
      setIsValidatingDNS(true)
      const response = await fetch('/api/mailboxes/dns/validate', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to validate DNS')
      
      const results = await response.json() as DNSValidationResult[]
      const updatedMailboxes = mailboxes.map(mailbox => {
        const result = results.find(r => r.email === mailbox.emailAddress)
        if (!result) return mailbox
        
        // Check if both SPF and DMARC are valid
        const isValid = result.spf.status === 'valid' && result.dmarc.status === 'valid'
        const dnsStatus: 'valid' | 'invalid' | 'not_found' = isValid ? 'valid' : 'invalid'
        return { 
          ...mailbox, 
          dnsStatus,
          dnsRecords: result
        }
      })
      
      setMailboxes(updatedMailboxes)
      toast.success('DNS validation completed')
    } catch (error) {
      console.error('Error validating DNS:', error)
      toast.error('Failed to validate DNS')
    } finally {
      setIsValidatingDNS(false)
    }
  }

  const handleBulkAction = async (action: string, config: BulkActionConfig) => {
    try {
      if (!selectedMailboxes.length) {
        toast.error('Please select at least one mailbox')
        return
      }

      let actionConfig: BulkActionConfig = {}
      
      switch (action) {
        case 'warmup':
          actionConfig = {
            maxEmails: 50,
            maxReplies: 10,
            schedule: {
              enabled: true,
              daysOfWeek: ['1', '2', '3', '4', '5'],
              startTime: '09:00',
              endTime: '17:00'
            }
          }
          break
        case 'campaign':
          actionConfig = {
            maxDailyEmails: 100,
            enableSignature: true,
            enableTracking: true
          }
          break
        case 'tracking':
          actionConfig = {
            domain: 'track.quickintell.org'
          }
          break
        case 'delete':
          actionConfig = {} // Empty object for delete action
          break
        default:
          throw new Error('Invalid action type')
      }

      const requestBody = {
        mailboxIds: selectedMailboxes,
        action,
        config: actionConfig
      }

      const response = await fetch('/api/mailboxes/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to perform bulk action')
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Bulk action completed successfully')
        loadMailboxes() // Reload mailboxes to reflect changes
        setSelectedMailboxes([]) // Clear selection after successful action
      } else {
        throw new Error(result.error || 'Failed to perform bulk action')
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to perform bulk action')
    }
  }

  const filteredMailboxes = mailboxes.filter(mailbox =>
    mailbox.emailAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mailbox.provider.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-10 mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-10 mx-auto">
      <div className="mb-10 flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight">Mailboxes</h1>
        <p className="text-lg text-muted-foreground">
          Manage your connected email accounts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active Emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Current Emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.allowed}</div>
            <p className="text-xs text-muted-foreground">Allowed Emails</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleValidateDNS}
            disabled={isValidatingDNS}
          >
            <Icon icon={Shield} className="h-4 w-4 mr-2" />
            {isValidatingDNS ? 'Validating...' : 'Validate DNS'}
          </Button>
          {selectedMailboxes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>Bulk Warmup Config</DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Email Warmup Config</DialogTitle>
                      <DialogDescription>
                        Configure warmup settings for selected mailboxes
                      </DialogDescription>
                    </DialogHeader>
                    {/* Add warmup config form here */}
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>Bulk Campaign Config</DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Campaign Config</DialogTitle>
                      <DialogDescription>
                        Configure campaign settings for selected mailboxes
                      </DialogDescription>
                    </DialogHeader>
                    {/* Add campaign config form here */}
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <DropdownMenuItem>Add Tracking Domain</DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Tracking Domain</DialogTitle>
                      <DialogDescription>
                        Add a tracking domain to selected mailboxes
                      </DialogDescription>
                    </DialogHeader>
                    {/* Add tracking domain form here */}
                  </DialogContent>
                </Dialog>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete selected mailboxes?')) {
                      handleBulkAction('delete', {})
                    }
                  }}
                >
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mailboxes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button asChild>
            <Link href="/settings/mailboxes/add">
              <Icon icon={Plus} className="h-4 w-4 mr-2" />
              Add Mailbox
            </Link>
          </Button>
        </div>
      </div>

      {filteredMailboxes.length > 0 ? (
        <MailboxesTable 
          mailboxes={filteredMailboxes}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          selectedMailboxes={selectedMailboxes}
          onSelectionChange={setSelectedMailboxes}
        />
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            {searchQuery ? 'No mailboxes match your search.' : 'No mailboxes found. Add your first mailbox to get started.'}
          </p>
        </div>
      )}
    </div>
  )
} 