'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'

interface StatsCardsProps {
  activeEmails: number
  currentEmails: number
  allowedEmails: number
}

export function StatsCards({
  activeEmails,
  currentEmails,
  allowedEmails,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Emails</CardTitle>
          <Icon icon={CheckCircle2} className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeEmails}</div>
          <p className="text-xs text-muted-foreground">
            Currently active email accounts
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Emails</CardTitle>
          <Icon icon={Mail} className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentEmails}</div>
          <p className="text-xs text-muted-foreground">
            Total email accounts in use
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Allowed Emails</CardTitle>
          <Icon icon={AlertCircle} className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{allowedEmails}</div>
          <p className="text-xs text-muted-foreground">
            Maximum allowed email accounts
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 