'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ReputationData {
  domain: string
  score: number
  status: 'good' | 'warning' | 'poor'
  blocklists: {
    name: string
    listed: boolean
    lastChecked: string
  }[]
  metrics: {
    name: string
    value: number
    status: 'good' | 'warning' | 'poor'
  }[]
}

export default function ReputationPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<ReputationData | null>(null)

  useEffect(() => {
    fetchReputationData()
  }, [])

  const fetchReputationData = async () => {
    try {
      setIsLoading(true)
      // TODO: Implement reputation data fetching
      // This is a mock response
      setData({
        domain: 'example.com',
        score: 85,
        status: 'good',
        blocklists: [
          {
            name: 'Spamhaus',
            listed: false,
            lastChecked: new Date().toISOString()
          },
          {
            name: 'Barracuda',
            listed: false,
            lastChecked: new Date().toISOString()
          }
        ],
        metrics: [
          {
            name: 'Bounce Rate',
            value: 2.5,
            status: 'good'
          },
          {
            name: 'Spam Complaints',
            value: 0.1,
            status: 'good'
          },
          {
            name: 'Open Rate',
            value: 35,
            status: 'warning'
          }
        ]
      })
    } catch (error) {
      toast.error('Failed to fetch reputation data')
      console.error('Reputation fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: ReputationData['status']) => {
    switch (status) {
      case 'good':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'poor':
        return 'text-red-500'
    }
  }

  const getStatusBadge = (status: ReputationData['status']) => {
    switch (status) {
      case 'good':
        return <Badge variant="default">Good</Badge>
      case 'warning':
        return <Badge variant="destructive">Warning</Badge>
      case 'poor':
        return <Badge variant="destructive">Poor</Badge>
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Domain Reputation</CardTitle>
              <CardDescription>
                Monitor your domain's email sending reputation
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={fetchReputationData}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{data.domain}</h3>
                  {getStatusBadge(data.status)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Reputation Score</span>
                    <span className={getStatusColor(data.status)}>
                      {data.score}/100
                    </span>
                  </div>
                  <Progress value={data.score} className="h-2" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Key Metrics</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {data.metrics.map((metric) => (
                    <Card key={metric.name}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {metric.name}
                            </span>
                            <Badge
                              variant={
                                metric.status === 'good'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {metric.value}%
                            </Badge>
                          </div>
                          <Progress
                            value={metric.value}
                            className="h-2"
                            variant={
                              metric.status === 'good'
                                ? 'default'
                                : 'destructive'
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Blocklist Status</h4>
                <div className="space-y-2">
                  {data.blocklists.map((list) => (
                    <div
                      key={list.name}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last checked: {new Date(list.lastChecked).toLocaleString()}
                        </p>
                      </div>
                      {list.listed ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {data.status !== 'good' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Your domain's reputation needs attention. Review the metrics above
                    and take necessary actions to improve deliverability.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
} 