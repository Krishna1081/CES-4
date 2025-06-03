'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Settings,
  FileSignature,
  LineChart,
  BarChart,
  Gauge,
  Workflow,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface MailboxStats {
  sent: number
  replies: number
  saved: number
  received: number
  successRate: number
}

interface Mailbox {
  id: number
  emailAddress: string
  provider: string
  status: 'active' | 'warning' | 'error'
  dailyLimit: number
  warmUpStatus: 'active' | 'inactive' | 'completed'
  dnsStatus: 'valid' | 'invalid' | 'not_found'
  stats: MailboxStats
}

interface MailboxesTableProps {
  mailboxes: Mailbox[]
  onStatusChange: (mailboxId: number, newStatus: 'active' | 'error') => Promise<void>
  onDelete: (mailboxId: number) => Promise<void>
  selectedMailboxes: number[]
  onSelectionChange: (mailboxIds: number[]) => void
}

export function MailboxesTable({ 
  mailboxes, 
  onStatusChange, 
  onDelete,
  selectedMailboxes,
  onSelectionChange
}: MailboxesTableProps) {
  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? mailboxes.map(m => m.id) : [])
  }

  const handleSelectOne = (checked: boolean, mailboxId: number) => {
    onSelectionChange(
      checked 
        ? [...selectedMailboxes, mailboxId]
        : selectedMailboxes.filter(id => id !== mailboxId)
    )
  }

  const handleToggleStatus = async (mailbox: Mailbox) => {
    try {
      await onStatusChange(mailbox.id, mailbox.status === 'active' ? 'error' : 'active')
    } catch (error) {
      console.error('Error toggling mailbox status:', error)
      toast.error('Failed to update mailbox status')
    }
  }

  const handleDelete = async (mailbox: Mailbox) => {
    if (!confirm('Are you sure you want to delete this mailbox? This action cannot be undone.')) {
      return
    }

    try {
      await onDelete(mailbox.id)
    } catch (error) {
      console.error('Error deleting mailbox:', error)
      toast.error('Failed to delete mailbox')
    }
  }

  const getDNSStatusBadge = (status: Mailbox['dnsStatus']) => {
    switch (status) {
      case 'valid':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Valid
          </Badge>
        )
      case 'invalid':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Invalid
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Found
          </Badge>
        )
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedMailboxes.length === mailboxes.length}
                onCheckedChange={handleSelectAll}
                aria-label="Select all mailboxes"
              />
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>DNS Status</TableHead>
            <TableHead className="text-right">Success %</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Reply</TableHead>
            <TableHead className="text-right">Saved</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mailboxes.map((mailbox) => (
            <TableRow key={mailbox.id}>
              <TableCell>
                <Checkbox 
                  checked={selectedMailboxes.includes(mailbox.id)}
                  onCheckedChange={(checked) => handleSelectOne(checked as boolean, mailbox.id)}
                  aria-label={`Select ${mailbox.emailAddress}`}
                />
              </TableCell>
              <TableCell>{mailbox.emailAddress}</TableCell>
              <TableCell>{getDNSStatusBadge(mailbox.dnsStatus)}</TableCell>
              <TableCell className="text-right">{mailbox.stats.successRate}%</TableCell>
              <TableCell className="text-right">{mailbox.stats.sent}</TableCell>
              <TableCell className="text-right">{mailbox.stats.replies}</TableCell>
              <TableCell className="text-right">{mailbox.stats.saved}</TableCell>
              <TableCell className="text-right">{mailbox.stats.received}</TableCell>
              <TableCell>
                <Switch 
                  checked={mailbox.status === 'active'}
                  onCheckedChange={() => handleToggleStatus(mailbox)}
                  aria-label="Toggle mailbox active status"
                />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Icon icon={MoreVertical} className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/mailboxes/${mailbox.id}`} className="flex items-center">
                        <Icon icon={Settings} className="h-4 w-4 mr-2" />
                        Email Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/mailboxes/${mailbox.id}/signature`} className="flex items-center">
                        <Icon icon={FileSignature} className="h-4 w-4 mr-2" />
                        Email Signature
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/mailboxes/${mailbox.id}/warmup-stats`} className="flex items-center">
                        <Icon icon={LineChart} className="h-4 w-4 mr-2" />
                        Warmup Stats
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/mailboxes/${mailbox.id}/campaign-stats`} className="flex items-center">
                        <Icon icon={BarChart} className="h-4 w-4 mr-2" />
                        Campaign Stats
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/mailboxes/${mailbox.id}/warmup`} className="flex items-center">
                        <Icon icon={Gauge} className="h-4 w-4 mr-2" />
                        Warmup Config
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/settings/mailboxes/${mailbox.id}/campaign-config`} className="flex items-center">
                        <Icon icon={Workflow} className="h-4 w-4 mr-2" />
                        Campaign Config
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(mailbox)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Icon icon={Trash2} className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 