'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  ArrowLeft, 
  ArrowRight,
  Users, 
  Target,
  Mail,
  Settings,
  Save,
  Play,
  AlertTriangle,
  Plus,
  Clock,
  GitBranch,
  CheckSquare,
  Edit,
  Trash2,
  Copy,
  X,
  Check
} from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import useSWR from 'swr'

interface SelectedSegment {
  id: string
  name: string
  matchingContacts: number
}

interface SequenceStep {
  id?: number
  sequenceId?: number
  stepOrder: number
  type: 'email' | 'delay' | 'condition' | 'task'
  configuration: {
    // Email step
    templateId?: number
    subject?: string
    body?: string
    tracking?: {
      opens: boolean
      clicks: boolean
    }
    abTest?: {
      enabled: boolean
      variable?: 'subject' | 'body'
      variations?: Array<{
        id: string
        subject?: string
        body?: string
        percentage: number
      }>
      duration?: number
    }
    // Delay step
    delayDays?: number
    delayHours?: number
    // Condition step
    condition?: {
      type: 'replied' | 'opened' | 'clicked' | 'bounced'
      operator: 'is' | 'is_not'
    }
    truePath?: number
    falsePath?: number
    // Task step
    taskType?: 'call' | 'linkedin' | 'manual'
    taskTitle?: string
    taskDescription?: string
  }
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
  body: string
}

interface CampaignSettings {
  sendingSchedule: {
    timezone: string
    workingDays: string[]
    workingHours: {
      start: string
      end: string
    }
  }
  sendingLimits: {
    dailyLimit: number
    throttling: number
  }
  trackingDomain?: string
  stopConditions: {
    stopOnReply: boolean
    stopOnClick: boolean
    stopOnBounce: boolean
  }
}

interface Mailbox {
  id: number
  emailAddress: string
  provider: string
  status: string
  dailyLimit: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function NewCampaignPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [campaignName, setCampaignName] = useState('')
  const [campaignGoal, setCampaignGoal] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null)
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([])
  const [settings, setSettings] = useState<CampaignSettings>({
    sendingSchedule: {
      timezone: 'UTC',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHours: {
        start: '09:00',
        end: '17:00'
      }
    },
    sendingLimits: {
      dailyLimit: 50,
      throttling: 5
    },
    stopConditions: {
      stopOnReply: true,
      stopOnClick: false,
      stopOnBounce: true
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedMailboxes, setSelectedMailboxes] = useState<number[]>([])

  // Fetch email templates
  const { data: templates } = useSWR<EmailTemplate[]>('/api/templates', fetcher)

  // Fetch active mailboxes
  const { data: mailboxes = [] } = useSWR<Mailbox[]>('/api/mailboxes/active', fetcher)

  // Check for pre-selected segment from localStorage
  useEffect(() => {
    const savedSegment = localStorage.getItem('selectedSegment')
    if (savedSegment) {
      try {
        const segment = JSON.parse(savedSegment)
        setSelectedSegment(segment)
        setCampaignName(`Campaign for ${segment.name}`)
        localStorage.removeItem('selectedSegment')
      } catch (error) {
        console.error('Error parsing saved segment:', error)
      }
    }
  }, [])

  const handleNext = () => {
    if (currentStep === 1 && (!campaignName || !selectedSegment)) {
      setError('Campaign name and target segment are required')
      return
    }
    if (currentStep === 2 && sequenceSteps.length === 0) {
      setError('At least one sequence step is required')
      return
    }
    setError(null)
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const handlePrevious = () => {
    setError(null)
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const addSequenceStep = (type: 'email' | 'delay' | 'condition' | 'task') => {
    const newStep: SequenceStep = {
      stepOrder: sequenceSteps.length + 1,
      type,
      configuration: getDefaultConfiguration(type)
    }
    setSequenceSteps([...sequenceSteps, newStep])
  }

  const getDefaultConfiguration = (type: string) => {
    switch (type) {
      case 'email':
        return {
          subject: '',
          body: '',
          tracking: { opens: true, clicks: true },
          abTest: { enabled: false }
        }
      case 'delay':
        return { delayDays: 3, delayHours: 0 }
      case 'condition':
        return {
          condition: { type: 'replied' as const, operator: 'is_not' as const },
          truePath: 0,
          falsePath: 0
        }
      case 'task':
        return {
          taskType: 'call' as const,
          taskTitle: '',
          taskDescription: ''
        }
      default:
        return {}
    }
  }

  const updateSequenceStep = (index: number, updatedStep: Partial<SequenceStep>) => {
    const updated = [...sequenceSteps]
    updated[index] = { ...updated[index], ...updatedStep }
    setSequenceSteps(updated)
  }

  const removeSequenceStep = (index: number) => {
    const updated = sequenceSteps.filter((_, i) => i !== index)
    // Reorder steps
    updated.forEach((step, i) => {
      step.stepOrder = i + 1
    })
    setSequenceSteps(updated)
  }

  const handleSave = async (status: 'draft' | 'active') => {
    setIsSaving(true)
    setError(null)

    try {
      // Create campaign
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          goal: campaignGoal,
          targetListId: selectedSegment ? parseInt(selectedSegment.id) : undefined,
          status,
          mailboxIds: selectedMailboxes
        })
      })

      if (!campaignResponse.ok) {
        const errorData = await campaignResponse.json()
        console.error('Campaign creation failed:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to create campaign')
      }
      
      const campaign = await campaignResponse.json()

      // Create sequence
      const sequenceResponse = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          name: `${campaignName} Sequence`
        })
      })

      if (!sequenceResponse.ok) {
        const errorData = await sequenceResponse.json()
        console.error('Sequence creation failed:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to create sequence')
      }
      
      const sequence = await sequenceResponse.json()

      // Create sequence steps
      for (const step of sequenceSteps) {
        const stepResponse = await fetch('/api/sequence-steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sequenceId: sequence.id,
            ...step
          })
        })
        
        if (!stepResponse.ok) {
          const errorData = await stepResponse.json()
          console.error('Step creation failed:', errorData)
          throw new Error(errorData.details || errorData.error || 'Failed to create sequence step')
        }
      }

      // Redirect to campaigns page
      window.location.href = '/campaigns'
    } catch (error) {
      console.error('Save failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to create campaign')
    } finally {
      setIsSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderCampaignDetails()
      case 2:
        return renderSequenceBuilder()
      case 3:
        return renderCampaignSettings()
      case 4:
        return renderReviewAndActivate()
      default:
        return null
    }
  }

  const renderCampaignDetails = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Basic information about your campaign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              placeholder="e.g., Q3 Prospecting - VP Marketing"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="campaign-goal">Campaign Goal (Optional)</Label>
            <textarea
              id="campaign-goal"
              placeholder="Describe the objective of this campaign..."
              value={campaignGoal}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampaignGoal(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Audience</CardTitle>
          <CardDescription>Select the segment of contacts for this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedSegment ? (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">{selectedSegment.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      {selectedSegment.matchingContacts.toLocaleString()} contacts
                    </span>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">Selected</Badge>
              </div>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSegment(null)}
                >
                  Change Segment
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-medium mb-2">No segment selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a segment from your existing segments or create a new one
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/contacts/segments">Browse Segments</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderSequenceBuilder = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sequence Builder</CardTitle>
          <CardDescription>Build your email sequence with different step types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sequenceSteps.map((step, index) => (
              <SequenceStepCard
                key={index}
                step={step}
                index={index}
                templates={templates || []}
                onUpdate={(updatedStep) => updateSequenceStep(index, updatedStep)}
                onRemove={() => removeSequenceStep(index)}
              />
            ))}
            
            {sequenceSteps.length === 0 && (
              <div className="border border-dashed rounded-lg p-8 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="font-medium mb-2">No steps added yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start building your sequence by adding your first step
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSequenceStep('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Add Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSequenceStep('delay')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Add Delay
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSequenceStep('condition')}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSequenceStep('task')}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const handleSelectMailbox = (id: number) => {
    if (selectedMailboxes.includes(id)) {
      setSelectedMailboxes(selectedMailboxes.filter(m => m !== id))
    } else {
      setSelectedMailboxes([...selectedMailboxes, id])
    }
  }

  const handleSelectAllMailboxes = () => {
    setSelectedMailboxes(mailboxes.map(m => m.id))
  }

  const handleRemoveAllMailboxes = () => {
    setSelectedMailboxes([])
  }

  const renderCampaignSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sending Mailboxes</CardTitle>
          <CardDescription>Select the mailboxes to use for sending emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-semibold mb-2 block">Accounts to use</Label>
            <div className="flex w-full max-w-full space-x-1 overflow-auto flex-grow max-h-60 overflow-y-auto border border-neutral-content rounded-box p-2 flex-col !space-y-1">
              {mailboxes.map(mailbox => {
                const selected = selectedMailboxes.includes(mailbox.id)
                return (
                  <label
                    key={mailbox.id}
                    className={
                      'label cursor-pointer border rounded-box px-4 transition-all flex items-center hover:opacity-90 ' +
                      (selected
                        ? 'bg-green-100 border-green-300 opacity-100'
                        : 'bg-neutral-100 border-neutral-200 opacity-50')
                    }
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selected}
                      onChange={() => handleSelectMailbox(mailbox.id)}
                      value={mailbox.emailAddress}
                    />
                    <span className="label-text">
                      {mailbox.emailAddress}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-default btn-xs"
                onClick={handleRemoveAllMailboxes}
              >
                Remove all
              </button>
              <button
                type="button"
                className="btn btn-default btn-xs"
                onClick={handleSelectAllMailboxes}
              >
                Select all
              </button>
            </div>
            <div className="mt-2 text-sm text-neutral-500">
              They must be active in Home tab. Adjust warmup config accordingly.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sending Schedule</CardTitle>
          <CardDescription>Configure when emails should be sent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Working Days</Label>
            <div className="flex gap-2 mt-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={day.toLowerCase()}
                    checked={settings.sendingSchedule.workingDays.includes(day.toLowerCase())}
                    onChange={(e) => {
                      const days = e.target.checked
                        ? [...settings.sendingSchedule.workingDays, day.toLowerCase()]
                        : settings.sendingSchedule.workingDays.filter(d => d !== day.toLowerCase())
                      setSettings({
                        ...settings,
                        sendingSchedule: { ...settings.sendingSchedule, workingDays: days }
                      })
                    }}
                    className="h-4 w-4"
                  />
                  <label htmlFor={day.toLowerCase()} className="text-sm">{day.slice(0, 3)}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={settings.sendingSchedule.workingHours.start}
                onChange={(e) => setSettings({
                  ...settings,
                  sendingSchedule: {
                    ...settings.sendingSchedule,
                    workingHours: { ...settings.sendingSchedule.workingHours, start: e.target.value }
                  }
                })}
              />
            </div>
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={settings.sendingSchedule.workingHours.end}
                onChange={(e) => setSettings({
                  ...settings,
                  sendingSchedule: {
                    ...settings.sendingSchedule,
                    workingHours: { ...settings.sendingSchedule.workingHours, end: e.target.value }
                  }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sending Limits</CardTitle>
          <CardDescription>Control email sending volume and throttling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="daily-limit">Daily Email Limit</Label>
            <Input
              id="daily-limit"
              type="number"
              value={settings.sendingLimits.dailyLimit}
              onChange={(e) => setSettings({
                ...settings,
                sendingLimits: { ...settings.sendingLimits, dailyLimit: parseInt(e.target.value) }
              })}
            />
          </div>
          <div>
            <Label htmlFor="throttling">Minutes Between Emails</Label>
            <Input
              id="throttling"
              type="number"
              value={settings.sendingLimits.throttling}
              onChange={(e) => setSettings({
                ...settings,
                sendingLimits: { ...settings.sendingLimits, throttling: parseInt(e.target.value) }
              })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stop Conditions</CardTitle>
          <CardDescription>Define when to stop sending emails to a contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Stop on Reply</Label>
            <Switch
              checked={settings.stopConditions.stopOnReply}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                stopConditions: { ...settings.stopConditions, stopOnReply: checked }
              })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Stop on Click</Label>
            <Switch
              checked={settings.stopConditions.stopOnClick}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                stopConditions: { ...settings.stopConditions, stopOnClick: checked }
              })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Stop on Bounce</Label>
            <Switch
              checked={settings.stopConditions.stopOnBounce}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                stopConditions: { ...settings.stopConditions, stopOnBounce: checked }
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderReviewAndActivate = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Review</CardTitle>
          <CardDescription>Review your campaign before activation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Campaign Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div><strong>Name:</strong> {campaignName}</div>
              <div><strong>Target:</strong> {selectedSegment?.name} ({selectedSegment?.matchingContacts} contacts)</div>
              {campaignGoal && <div><strong>Goal:</strong> {campaignGoal}</div>}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Sequence ({sequenceSteps.length} steps)</h3>
            <div className="space-y-2">
              {sequenceSteps.map((step, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step {index + 1}</Badge>
                    <span className="capitalize">{step.type}</span>
                    {step.type === 'email' && step.configuration.subject && (
                      <span className="text-sm text-gray-600">- {step.configuration.subject}</span>
                    )}
                    {step.type === 'delay' && (
                      <span className="text-sm text-gray-600">
                        - {step.configuration.delayDays}d {step.configuration.delayHours}h
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Sending Mailboxes</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              {selectedMailboxes.length > 0 ? (
                mailboxes
                  .filter(mailbox => selectedMailboxes.includes(mailbox.id))
                  .map(mailbox => (
                    <div key={mailbox.id}>
                      {mailbox.emailAddress} ({mailbox.provider})
                      <span className="text-sm text-gray-600 ml-2">
                        Daily limit: {mailbox.dailyLimit}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-red-500">No mailboxes selected</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Settings</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div><strong>Schedule:</strong> {settings.sendingSchedule.workingDays.join(', ')} {settings.sendingSchedule.workingHours.start}-{settings.sendingSchedule.workingHours.end}</div>
              <div><strong>Daily Limit:</strong> {settings.sendingLimits.dailyLimit} emails</div>
              <div><strong>Stop Conditions:</strong> {Object.entries(settings.stopConditions).filter(([_, value]) => value).map(([key, _]) => key).join(', ')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Campaign</h1>
          <p className="text-muted-foreground">
            Step {currentStep} of 4: {
              currentStep === 1 ? 'Campaign Details' :
              currentStep === 2 ? 'Sequence Builder' :
              currentStep === 3 ? 'Campaign Settings' :
              'Review & Activate'
            }
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step < currentStep ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 4 && (
              <div className={`w-16 h-1 ${step < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {renderStepContent()}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          {currentStep === 4 ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave('active')}
                disabled={isSaving}
              >
                <Play className="h-4 w-4 mr-2" />
                Activate Campaign
              </Button>
            </>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Sequence Step Card Component
function SequenceStepCard({ 
  step, 
  index, 
  templates, 
  onUpdate, 
  onRemove 
}: {
  step: SequenceStep
  index: number
  templates: EmailTemplate[]
  onUpdate: (step: Partial<SequenceStep>) => void
  onRemove: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStepIcon = () => {
    switch (step.type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'delay': return <Clock className="h-4 w-4" />
      case 'condition': return <GitBranch className="h-4 w-4" />
      case 'task': return <CheckSquare className="h-4 w-4" />
    }
  }

  const getStepTitle = () => {
    switch (step.type) {
      case 'email': return step.configuration.subject || 'Email Step'
      case 'delay': return `Wait ${step.configuration.delayDays || 0}d ${step.configuration.delayHours || 0}h`
      case 'condition': return `If ${step.configuration.condition?.operator} ${step.configuration.condition?.type}`
      case 'task': return step.configuration.taskTitle || 'Task Step'
    }
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Step {index + 1}</Badge>
            {getStepIcon()}
            <span className="font-medium">{getStepTitle()}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {step.type === 'email' && (
            <EmailStepEditor step={step} templates={templates} onUpdate={onUpdate} />
          )}
          {step.type === 'delay' && (
            <DelayStepEditor step={step} onUpdate={onUpdate} />
          )}
          {step.type === 'condition' && (
            <ConditionStepEditor step={step} onUpdate={onUpdate} />
          )}
          {step.type === 'task' && (
            <TaskStepEditor step={step} onUpdate={onUpdate} />
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Email Step Editor Component
function EmailStepEditor({ 
  step, 
  templates, 
  onUpdate 
}: {
  step: SequenceStep
  templates: EmailTemplate[]
  onUpdate: (step: Partial<SequenceStep>) => void
}) {
  const [showABTest, setShowABTest] = useState(step.configuration.abTest?.enabled || false)

  return (
    <div className="space-y-4">
      <div>
        <Label>Template</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={step.configuration.templateId || ''}
          onChange={(e) => {
            const templateId = e.target.value ? parseInt(e.target.value) : undefined
            const template = templates.find(t => t.id === templateId)
            onUpdate({
              configuration: {
                ...step.configuration,
                templateId,
                subject: template?.subject || step.configuration.subject,
                body: template?.body || step.configuration.body
              }
            })
          }}
        >
          <option value="">Select template or create new</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Subject Line</Label>
        <Input
          value={step.configuration.subject || ''}
          onChange={(e) => onUpdate({
            configuration: { ...step.configuration, subject: e.target.value }
          })}
          placeholder="Email subject with {{first_name}} personalization"
        />
      </div>

      <div>
        <Label>Email Body</Label>
        <textarea
          value={step.configuration.body || ''}
          onChange={(e) => onUpdate({
            configuration: { ...step.configuration, body: e.target.value }
          })}
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Hi {{first_name}}, I hope this email finds you well..."
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={step.configuration.tracking?.opens || true}
            onCheckedChange={(checked) => onUpdate({
              configuration: {
                ...step.configuration,
                tracking: { 
                  opens: checked, 
                  clicks: step.configuration.tracking?.clicks || true 
                }
              }
            })}
          />
          <Label>Track Opens</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={step.configuration.tracking?.clicks || true}
            onCheckedChange={(checked) => onUpdate({
              configuration: {
                ...step.configuration,
                tracking: { 
                  opens: step.configuration.tracking?.opens || true,
                  clicks: checked 
                }
              }
            })}
          />
          <Label>Track Clicks</Label>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={showABTest}
          onCheckedChange={(checked) => {
            setShowABTest(checked)
            onUpdate({
              configuration: {
                ...step.configuration,
                abTest: { 
                  enabled: checked,
                  variable: step.configuration.abTest?.variable || 'subject',
                  variations: step.configuration.abTest?.variations || [],
                  duration: step.configuration.abTest?.duration || 24
                }
              }
            })
          }}
        />
        <Label>A/B Test This Step</Label>
      </div>

      {showABTest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">A/B Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Test Variable</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={step.configuration.abTest?.variable || 'subject'}
                onChange={(e) => onUpdate({
                  configuration: {
                    ...step.configuration,
                    abTest: {
                      enabled: step.configuration.abTest?.enabled || true,
                      variable: e.target.value as 'subject' | 'body',
                      variations: step.configuration.abTest?.variations || [],
                      duration: step.configuration.abTest?.duration || 24
                    }
                  }
                })}
              >
                <option value="subject">Subject Line</option>
                <option value="body">Email Body</option>
              </select>
            </div>
            <div>
              <Label>Test Duration (hours)</Label>
              <Input
                type="number"
                value={step.configuration.abTest?.duration || 24}
                onChange={(e) => onUpdate({
                  configuration: {
                    ...step.configuration,
                    abTest: {
                      enabled: step.configuration.abTest?.enabled || true,
                      variable: step.configuration.abTest?.variable || 'subject',
                      variations: step.configuration.abTest?.variations || [],
                      duration: parseInt(e.target.value)
                    }
                  }
                })}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Delay Step Editor Component
function DelayStepEditor({ 
  step, 
  onUpdate 
}: {
  step: SequenceStep
  onUpdate: (step: Partial<SequenceStep>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Days</Label>
          <Input
            type="number"
            min="0"
            value={step.configuration.delayDays || 0}
            onChange={(e) => onUpdate({
              configuration: { ...step.configuration, delayDays: parseInt(e.target.value) }
            })}
          />
        </div>
        <div>
          <Label>Hours</Label>
          <Input
            type="number"
            min="0"
            max="23"
            value={step.configuration.delayHours || 0}
            onChange={(e) => onUpdate({
              configuration: { ...step.configuration, delayHours: parseInt(e.target.value) }
            })}
          />
        </div>
      </div>
    </div>
  )
}

// Condition Step Editor Component  
function ConditionStepEditor({ 
  step, 
  onUpdate 
}: {
  step: SequenceStep
  onUpdate: (step: Partial<SequenceStep>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Condition</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={step.configuration.condition?.type || 'replied'}
            onChange={(e) => onUpdate({
              configuration: {
                ...step.configuration,
                condition: {
                  type: e.target.value as 'replied' | 'opened' | 'clicked' | 'bounced',
                  operator: step.configuration.condition?.operator || 'is_not'
                }
              }
            })}
          >
            <option value="replied">Replied</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
        <div>
          <Label>Operator</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={step.configuration.condition?.operator || 'is_not'}
            onChange={(e) => onUpdate({
              configuration: {
                ...step.configuration,
                condition: {
                  type: step.configuration.condition?.type || 'replied',
                  operator: e.target.value as 'is' | 'is_not'
                }
              }
            })}
          >
            <option value="is">Is</option>
            <option value="is_not">Is Not</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// Task Step Editor Component
function TaskStepEditor({ 
  step, 
  onUpdate 
}: {
  step: SequenceStep
  onUpdate: (step: Partial<SequenceStep>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Task Type</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={step.configuration.taskType || 'call'}
          onChange={(e) => onUpdate({
            configuration: {
              ...step.configuration,
              taskType: e.target.value as 'call' | 'linkedin' | 'manual'
            }
          })}
        >
          <option value="call">Phone Call</option>
          <option value="linkedin">LinkedIn Message</option>
          <option value="manual">Manual Task</option>
        </select>
      </div>
      <div>
        <Label>Task Title</Label>
        <Input
          value={step.configuration.taskTitle || ''}
          onChange={(e) => onUpdate({
            configuration: { ...step.configuration, taskTitle: e.target.value }
          })}
          placeholder="Call to discuss partnership"
        />
      </div>
      <div>
        <Label>Task Description</Label>
        <textarea
          value={step.configuration.taskDescription || ''}
          onChange={(e) => onUpdate({
            configuration: { ...step.configuration, taskDescription: e.target.value }
          })}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Detailed instructions for the task..."
        />
      </div>
    </div>
  )
} 