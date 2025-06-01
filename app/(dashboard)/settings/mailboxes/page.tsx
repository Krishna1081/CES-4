'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Plus, Shield } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MailboxesTable } from './components/mailboxes-table'

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
  stats: MailboxStats
}

export default function MailboxesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMailboxes()
  }, [])

  const loadMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes')
      if (!response.ok) throw new Error('Failed to fetch mailboxes')
      const data = await response.json()
      
      // Fetch stats for each mailbox
      const mailboxesWithStats = await Promise.all(
        data.map(async (mailbox: Mailbox) => {
          const statsResponse = await fetch(`/api/mailboxes/${mailbox.id}/stats`)
          if (!statsResponse.ok) throw new Error(`Failed to fetch stats for mailbox ${mailbox.id}`)
          const stats = await statsResponse.json()
          return { ...mailbox, stats }
        })
      )
      
      setMailboxes(mailboxesWithStats)
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
      const response = await fetch(`/api/mailboxes/${mailboxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) throw new Error('Failed to update mailbox')
      
      const updatedMailboxes = mailboxes.map(m => 
        m.id === mailboxId ? { ...m, status: newStatus } : m
      )
      setMailboxes(updatedMailboxes)
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
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" asChild>
            <Link href="/settings/mailboxes/dns">
              <Icon icon={Shield} className="h-4 w-4 mr-2" />
              DNS Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/settings/mailboxes/add">
              <Icon icon={Plus} className="h-4 w-4 mr-2" />
              Add Mailbox
            </Link>
          </Button>
        </div>
      </div>

      {mailboxes.length > 0 ? (
        <MailboxesTable 
          mailboxes={mailboxes}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No mailboxes found. Add your first mailbox to get started.</p>
        </div>
      )}
    </div>
  )
} 