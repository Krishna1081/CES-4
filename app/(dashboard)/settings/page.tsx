'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Shield, Settings2, Users, Bell, CreditCard } from 'lucide-react'
import Link from 'next/link'

const settingsSections = [
  {
    title: 'Mailboxes',
    description: 'Manage your email accounts and connections',
    icon: Mail,
    href: '/settings/mailboxes',
    features: [
      'Connect email accounts',
      'Configure SMTP settings',
      'Monitor mailbox health'
    ]
  },
  {
    title: 'Deliverability',
    description: 'Optimize your email sending reputation',
    icon: Shield,
    href: '/settings/deliverability',
    features: [
      'Warm-up settings',
      'DNS configuration',
      'Reputation monitoring'
    ]
  },
  {
    title: 'Team',
    description: 'Manage team members and permissions',
    icon: Users,
    href: '/settings/team',
    features: [
      'Invite team members',
      'Set role permissions',
      'Manage access'
    ]
  },
  {
    title: 'Notifications',
    description: 'Configure your notification preferences',
    icon: Bell,
    href: '/settings/notifications',
    features: [
      'Email notifications',
      'Alert settings',
      'Delivery reports'
    ]
  },
  {
    title: 'Billing',
    description: 'Manage your subscription and billing',
    icon: CreditCard,
    href: '/settings/billing',
    features: [
      'View usage',
      'Update payment method',
      'Manage subscription'
    ]
  },
  {
    title: 'General',
    description: 'Configure general application settings',
    icon: Settings2,
    href: '/settings/general',
    features: [
      'Account settings',
      'API configuration',
      'Integration settings'
    ]
  }
]

export default function SettingsPage() {
  return (
    <div className="container max-w-7xl py-10 mx-auto">
      <div className="mb-10 space-y-1 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 place-items-center">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href} className="w-full max-w-md">
            <Card className="group relative h-full overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-primary/10 p-3 transition-colors duration-200 group-hover:bg-primary/20">
                    <section.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                    <CardDescription className="mt-1.5 text-base">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {section.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 transition-colors duration-200 group-hover:bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-transparent transition-all duration-200 group-hover:ring-primary/20" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
} 