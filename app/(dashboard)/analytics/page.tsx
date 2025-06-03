'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  Users,
  MousePointer,
  Reply,
  Calendar,
  Filter,
  Eye,
  GitBranch
} from 'lucide-react'
import useSWR from 'swr'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { addDays, format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

interface AnalyticsData {
  overview: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalReplied: number
    openRate: number
    clickRate: number
    replyRate: number
    unsubscribeRate: number
  }
  campaigns: Array<{
    id: number
    name: string
    status: string
    totalSent: number
    opened: number
    clicked: number
    replied: number
    openRate: number
    clickRate: number
    replyRate: number
    lastActivity: string
  }>
  chartData: {
    openRates: Array<{ date: string; rate: number }>
    replyRates: Array<{ date: string; rate: number }>
    sentEmails: Array<{ date: string; count: number }>
  }
  mailboxes: Array<{
    id: number
    emailAddress: string
    totalSent: number
    deliveryRate: number
  }>
}

interface CampaignSteps {
  campaignId: number
  campaignName: string
  steps: Array<{
    stepId: number
    stepOrder: number
    type: string
    subject?: string
    totalSent: number
    opened: number
    clicked: number
    replied: number
    openRate: number
    clickRate: number
    replyRate: number
    abTest?: {
      id: number
      variableTested: string
      variations: Array<{
        id: string
        name: string
        totalSent: number
        openRate: number
        clickRate: number
        replyRate: number
      }>
      winner?: string
    }
  }>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null)
  const [selectedMailbox, setSelectedMailbox] = useState<number | null>(null)
  const [drillDownCampaign, setDrillDownCampaign] = useState<number | null>(null)

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (dateRange?.from) params.append('from', format(dateRange.from, 'yyyy-MM-dd'))
    if (dateRange?.to) params.append('to', format(dateRange.to, 'yyyy-MM-dd'))
    if (selectedCampaign) params.append('campaignId', selectedCampaign.toString())
    if (selectedMailbox) params.append('mailboxId', selectedMailbox.toString())
    return params.toString()
  }, [dateRange, selectedCampaign, selectedMailbox])

  // Fetch analytics data
  const { data: analytics, isLoading } = useSWR<AnalyticsData>(
    `/api/analytics?${queryParams}`,
    fetcher
  )

  // Fetch campaign steps for drill-down
  const { data: campaignSteps } = useSWR<CampaignSteps>(
    drillDownCampaign ? `/api/analytics/campaigns/${drillDownCampaign}/steps?${queryParams}` : null,
    fetcher
  )

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatNumber = (value: number) => value.toLocaleString()

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your email campaign performance and optimize for better results
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => {
            const params = new URLSearchParams()
            if (dateRange?.from) params.append('from', format(dateRange.from, 'yyyy-MM-dd'))
            if (dateRange?.to) params.append('to', format(dateRange.to, 'yyyy-MM-dd'))
            if (selectedCampaign) params.append('campaignId', selectedCampaign.toString())
            if (selectedMailbox) params.append('mailboxId', selectedMailbox.toString())
            
            // Trigger CSV download
            window.location.href = `/api/analytics/export?${params.toString()}`
          }}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-auto"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Campaign:</label>
              <select
                value={selectedCampaign || ''}
                onChange={(e) => setSelectedCampaign(e.target.value ? parseInt(e.target.value) : null)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Campaigns</option>
                {analytics?.campaigns?.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mailbox:</label>
              <select
                value={selectedMailbox || ''}
                onChange={(e) => setSelectedMailbox(e.target.value ? parseInt(e.target.value) : null)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="">All Mailboxes</option>
                {analytics?.mailboxes?.map(mailbox => (
                  <option key={mailbox.id} value={mailbox.id}>
                    {mailbox.emailAddress}
                  </option>
                ))}
              </select>
            </div>

            {(selectedCampaign || selectedMailbox) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCampaign(null)
                  setSelectedMailbox(null)
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(analytics?.overview?.totalSent ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total emails delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analytics?.overview?.openRate ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(analytics?.overview?.totalOpened ?? 0)} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analytics?.overview?.clickRate ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(analytics?.overview?.totalClicked ?? 0)} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            <Reply className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(analytics?.overview?.replyRate ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(analytics?.overview?.totalReplied ?? 0)} replies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Open Rate Trend</CardTitle>
            <CardDescription>Email open rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics?.chartData?.openRates ?? []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Open Rate']}
                    labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reply Rate Trend</CardTitle>
            <CardDescription>Email reply rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics?.chartData?.replyRates ?? []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Reply Rate']}
                    labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add a new chart for sent emails */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Emails Sent Over Time</CardTitle>
          <CardDescription>Daily email volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics?.chartData?.sentEmails ?? []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, 'Emails Sent']}
                  labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                />
                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance Table or Step Drill-down */}
      {drillDownCampaign && campaignSteps ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Step-by-Step Performance</CardTitle>
                <CardDescription>
                  Detailed analysis for {campaignSteps.campaignName}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setDrillDownCampaign(null)}
              >
                Back to Overview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaignSteps.steps.map((step, index) => (
                <Card key={step.stepId} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Step {step.stepOrder}</Badge>
                        <span className="font-medium">
                          {step.type === 'email' ? step.subject || 'Email Step' : `${step.type} Step`}
                        </span>
                        {step.abTest && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            A/B Test
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatNumber(step.totalSent)} sent
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatPercentage(step.openRate)}
                        </div>
                        <div className="text-xs text-muted-foreground">Open Rate</div>
                        <div className="text-xs">{formatNumber(step.opened)} opens</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPercentage(step.clickRate)}
                        </div>
                        <div className="text-xs text-muted-foreground">Click Rate</div>
                        <div className="text-xs">{formatNumber(step.clicked)} clicks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatPercentage(step.replyRate)}
                        </div>
                        <div className="text-xs text-muted-foreground">Reply Rate</div>
                        <div className="text-xs">{formatNumber(step.replied)} replies</div>
                      </div>
                    </div>

                    {step.abTest && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          A/B Test Results - {step.abTest.variableTested}
                          {step.abTest.winner && (
                            <Badge variant="default" className="ml-2">
                              Winner: {step.abTest.winner}
                            </Badge>
                          )}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {step.abTest.variations.map((variation) => (
                            <div
                              key={variation.id}
                              className={`p-3 rounded-lg border ${
                                step.abTest?.winner === variation.id
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{variation.name}</span>
                                {step.abTest?.winner === variation.id && (
                                  <Badge variant="default" className="text-xs">Winner</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="font-medium">{formatPercentage(variation.openRate)}</div>
                                  <div className="text-xs text-muted-foreground">Open Rate</div>
                                </div>
                                <div>
                                  <div className="font-medium">{formatPercentage(variation.clickRate)}</div>
                                  <div className="text-xs text-muted-foreground">Click Rate</div>
                                </div>
                                <div>
                                  <div className="font-medium">{formatPercentage(variation.replyRate)}</div>
                                  <div className="text-xs text-muted-foreground">Reply Rate</div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatNumber(variation.totalSent)} sent
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Click on a campaign to view step-by-step performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Campaign</th>
                    <th className="text-right py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Sent</th>
                    <th className="text-right py-2 font-medium">Open Rate</th>
                    <th className="text-right py-2 font-medium">Click Rate</th>
                    <th className="text-right py-2 font-medium">Reply Rate</th>
                    <th className="text-right py-2 font-medium">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.campaigns?.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setDrillDownCampaign(campaign.id)}
                    >
                      <td className="py-3">
                        <div className="font-medium">{campaign.name}</div>
                      </td>
                      <td className="text-right py-3">
                        <Badge
                          variant={
                            campaign.status === 'active' ? 'default' :
                            campaign.status === 'paused' ? 'secondary' :
                            campaign.status === 'completed' ? 'default' : 'outline'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="text-right py-3 font-mono">
                        {formatNumber(campaign.totalSent)}
                      </td>
                      <td className="text-right py-3 font-mono">
                        <span className={campaign.openRate > 0.25 ? 'text-green-600' : campaign.openRate > 0.15 ? 'text-yellow-600' : 'text-red-600'}>
                          {formatPercentage(campaign.openRate)}
                        </span>
                      </td>
                      <td className="text-right py-3 font-mono">
                        <span className={campaign.clickRate > 0.05 ? 'text-green-600' : campaign.clickRate > 0.02 ? 'text-yellow-600' : 'text-red-600'}>
                          {formatPercentage(campaign.clickRate)}
                        </span>
                      </td>
                      <td className="text-right py-3 font-mono">
                        <span className={campaign.replyRate > 0.10 ? 'text-green-600' : campaign.replyRate > 0.05 ? 'text-yellow-600' : 'text-red-600'}>
                          {formatPercentage(campaign.replyRate)}
                        </span>
                      </td>
                      <td className="text-right py-3 text-sm text-muted-foreground">
                        {campaign.lastActivity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {(!analytics?.campaigns || analytics.campaigns.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No campaign data available for the selected filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 