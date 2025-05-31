'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Settings2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const deliverabilitySections = [
  {
    title: 'Warm-up Settings',
    description: 'Configure email warm-up strategies to build sender reputation',
    icon: Settings2,
    href: '/settings/deliverability/warm-up',
    features: [
      'Set daily email limits',
      'Configure ramp-up periods',
      'Monitor warm-up progress'
    ]
  },
  {
    title: 'DNS Configuration',
    description: 'Manage your domain\'s email authentication records',
    icon: Shield,
    href: '/settings/deliverability/dns',
    features: [
      'SPF record management',
      'DKIM configuration',
      'DMARC policy setup'
    ]
  }
]

export default function DeliverabilityPage() {
  return (
    <div className="container max-w-7xl py-10 mx-auto">
      <div className="mb-10 space-y-1 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Deliverability Settings</h1>
        <p className="text-lg text-muted-foreground">
          Optimize your email sending reputation and deliverability
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 place-items-center max-w-5xl mx-auto">
        {deliverabilitySections.map((section) => (
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
                <div className="space-y-4">
                  <ul className="space-y-3">
                    {section.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/50 transition-colors duration-200 group-hover:bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between text-muted-foreground transition-colors duration-200 group-hover:text-foreground"
                  >
                    Configure
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
              <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-transparent transition-all duration-200 group-hover:ring-primary/20" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 max-w-4xl mx-auto">
        <Link href="/deliverability/reputation">
          <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-medium">Domain Reputation</h3>
                <p className="text-base text-muted-foreground">
                  Monitor your domain's email sending reputation and metrics
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground"
              >
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </CardContent>
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-transparent transition-all duration-200 group-hover:ring-primary/20" />
          </Card>
        </Link>
      </div>
    </div>
  )
} 