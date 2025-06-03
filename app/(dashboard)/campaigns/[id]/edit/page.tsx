'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  ArrowLeft, 
  Save,
  Play,
  Pause,
  AlertTriangle,
  Plus,
  Clock,
  GitBranch,
  CheckSquare,
  Edit,
  Trash2,
  Mail,
  Users,
  Target
} from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import useSWR from 'swr'

interface Campaign {
  id: number
  name: string
  goal?: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  targetListId?: number
  createdAt: string
  metadata?: {
    mailboxIds: number[]
  }
  sequences: Array<{
    id: number
    name: string
    steps: SequenceStep[]
  }>
}

interface SequenceStep {
  id: number
  sequenceId: number
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

interface ContactList {
  id: number
  name: string
  type: string
}

// Add Mailbox interface
interface Mailbox {
  id: number
  emailAddress: string
  provider: string
  status: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EditCampaignPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaignName, setCampaignName] = useState('')
  const [campaignGoal, setCampaignGoal] = useState('')
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'active' | 'paused' | 'completed'>('draft')
  const [targetListId, setTargetListId] = useState<number | undefined>()
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedMailboxes, setSelectedMailboxes] = useState<number[]>([])

  // Fetch campaign data
  const { data: campaign, error: campaignError, mutate } = useSWR<Campaign>(
    campaignId ? `/api/campaigns/${campaignId}` : null,
    fetcher
  )

  // Fetch templates and lists
  const { data: templates = [] } = useSWR<EmailTemplate[]>('/api/templates', fetcher)
  const { data: lists = [] } = useSWR<ContactList[]>('/api/contacts/lists', fetcher)

  // Add mailboxes data fetching
  const { data: mailboxes = [] } = useSWR<Mailbox[]>('/api/mailboxes', fetcher)

  // Populate form when campaign data loads
  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.name)
      setCampaignGoal(campaign.goal || '')
      setCampaignStatus(campaign.status)
      setTargetListId(campaign.targetListId)
      setSelectedMailboxes(campaign.metadata?.mailboxIds || [])
      
      // Load sequence steps
      if (campaign.sequences.length > 0) {
        setSequenceSteps(campaign.sequences[0].steps)
      }
    }
  }, [campaign])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Update campaign basic info
      const campaignResponse = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          goal: campaignGoal,
          status: campaignStatus,
          targetListId,
          metadata: {
            mailboxIds: selectedMailboxes
          }
        })
      })

      if (!campaignResponse.ok) {
        const errorData = await campaignResponse.json()
        throw new Error(errorData.details || errorData.error || 'Failed to update campaign')
      }

      // Update sequence steps
      if (campaign?.sequences && campaign.sequences.length > 0) {
        const sequenceId = campaign.sequences[0].id

        // Delete existing steps and recreate them
        // This is a simple approach - in production you'd want to be more surgical
        for (const step of campaign.sequences[0].steps) {
          await fetch(`/api/sequence-steps?id=${step.id}`, {
            method: 'DELETE'
          })
        }

        // Create new steps
        for (const step of sequenceSteps) {
          await fetch('/api/sequence-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sequenceId,
              stepOrder: step.stepOrder,
              type: step.type,
              configuration: step.configuration
            })
          })
        }
      }

      // Refresh the campaign data
      mutate()
      
      // Show success message
      alert('Campaign updated successfully!')
      
    } catch (error) {
      console.error('Save failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to update campaign')
    } finally {
      setIsSaving(false)
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

  const addSequenceStep = (type: 'email' | 'delay' | 'condition' | 'task') => {
    const newStep: SequenceStep = {
      id: 0, // Will be assigned by database
      sequenceId: campaign?.sequences[0]?.id || 0,
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

  if (campaignError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading campaign</h2>
          <p className="text-muted-foreground">Campaign not found or failed to load</p>
          <Button asChild className="mt-4">
            <Link href="/campaigns">Back to Campaigns</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    )
  }

  const selectedList = lists.find(list => list.id === targetListId)

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
          <h1 className="text-3xl font-bold tracking-tight">Edit Campaign</h1>
          <p className="text-muted-foreground">
            Modify your campaign settings and sequence
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Campaign Details */}
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
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="campaign-goal">Campaign Goal (Optional)</Label>
              <textarea
                id="campaign-goal"
                value={campaignGoal}
                onChange={(e) => setCampaignGoal(e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="campaign-status">Campaign Status</Label>
              <select
                id="campaign-status"
                value={campaignStatus}
                onChange={(e) => setCampaignStatus(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <Label htmlFor="target-list">Target List</Label>
              <select
                id="target-list"
                value={targetListId || ''}
                onChange={(e) => setTargetListId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No target list</option>
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="font-semibold mb-2 block">Sending Mailboxes</Label>
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

        {/* Sequence Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Sequence Steps</CardTitle>
            <CardDescription>Edit your email sequence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sequenceSteps.map((step, index) => (
                <SequenceStepCard
                  key={index}
                  step={step}
                  index={index}
                  templates={templates}
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

      {/* Save Button */}
      <div className="flex justify-end mt-8">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// Reuse the same sequence step card components from the new campaign page
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

// Email Step Editor Component (simplified version)
function EmailStepEditor({ 
  step, 
  templates, 
  onUpdate 
}: {
  step: SequenceStep
  templates: EmailTemplate[]
  onUpdate: (step: Partial<SequenceStep>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Template</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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