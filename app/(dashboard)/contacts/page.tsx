import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Upload, Settings, Filter, Plus } from 'lucide-react'
import Link from 'next/link'
import { ContactsStats } from '@/components/contacts/contacts-stats'

function QuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <Link href="/contacts/import">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Contacts
            </CardTitle>
            <CardDescription>
              Upload CSV file or connect your CRM to import contacts
            </CardDescription>
          </CardHeader>
        </Link>
      </Card>
      
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <Link href="/contacts/segments">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Create Segment
            </CardTitle>
            <CardDescription>
              Build dynamic segments based on contact properties and behavior
            </CardDescription>
          </CardHeader>
        </Link>
      </Card>

      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <Link href="/integrations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Integrations
            </CardTitle>
            <CardDescription>
              Connect HubSpot, Salesforce, and other CRMs for automated sync
            </CardDescription>
          </CardHeader>
        </Link>
      </Card>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contacts, segments, and integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/contacts/import">
              <Plus className="h-4 w-4 mr-2" />
              Import Contacts
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <Suspense fallback={<div>Loading stats...</div>}>
          <ContactsStats />
        </Suspense>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <QuickActions />
        </div>
      </div>
    </div>
  )
} 