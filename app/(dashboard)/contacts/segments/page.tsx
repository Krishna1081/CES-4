'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Play, 
  Users, 
  Filter, 
  Save,
  Eye,
  Settings,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Condition {
  id: string
  field: string
  operator: string
  value: string
  logicalOperator?: 'AND' | 'OR'
}

interface Segment {
  id: string
  name: string
  conditions: Condition[]
  matchingContacts: number
  createdAt: Date
  isActive: boolean
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SegmentsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [segmentName, setSegmentName] = useState('')
  const [conditions, setConditions] = useState<Condition[]>([])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch segments from backend
  const { data: segments, error: fetchError, isLoading } = useSWR<Segment[]>('/api/segments', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const availableFields = [
    { key: 'email', label: 'Email' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'companyName', label: 'Company Name' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'source', label: 'Source' },
    { key: 'createdAt', label: 'Created Date' },
  ]

  const operators = {
    text: [
      { key: 'equals', label: 'Equals' },
      { key: 'contains', label: 'Contains' },
      { key: 'startsWith', label: 'Starts with' },
      { key: 'endsWith', label: 'Ends with' },
      { key: 'notEquals', label: 'Does not equal' }
    ],
    date: [
      { key: 'on', label: 'On' },
      { key: 'before', label: 'Before' },
      { key: 'after', label: 'After' },
    ]
  }

  const addCondition = () => {
    const newCondition: Condition = {
      id: Date.now().toString(),
      field: '',
      operator: '',
      value: '',
      logicalOperator: conditions.length > 0 ? 'AND' : undefined
    }
    setConditions([...conditions, newCondition])
  }

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(condition =>
      condition.id === id ? { ...condition, ...updates } : condition
    ))
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(condition => condition.id !== id))
  }

  const getOperatorsForField = (field: string) => {
    if (['createdAt'].includes(field)) {
      return operators.date
    }
    return operators.text
  }

  const startEdit = (segment: Segment) => {
    setEditingSegment(segment)
    setSegmentName(segment.name)
    setConditions(segment.conditions)
    setPreviewCount(segment.matchingContacts)
    setError(null)
    setIsCreating(true) // Reuse the creation UI
  }

  const cancelEdit = () => {
    setEditingSegment(null)
    setSegmentName('')
    setConditions([])
    setPreviewCount(null)
    setError(null)
    setIsCreating(false)
  }

  const generatePreview = async () => {
    if (conditions.length === 0) return
    
    setIsLoadingPreview(true)
    setError(null)
    
    try {
      const response = await fetch('/api/segments/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conditions: conditions.filter(c => c.field && c.operator && c.value)
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to preview segment')
      }

      const result = await response.json()
      setPreviewCount(result.matchingContacts)
    } catch (error) {
      console.error('Preview failed:', error)
      setError('Failed to preview segment matches')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const saveSegment = async () => {
    if (!segmentName || conditions.length === 0) return
    
    const validConditions = conditions.filter(c => c.field && c.operator && c.value)
    if (validConditions.length === 0) {
      setError('At least one complete condition is required')
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      const url = editingSegment ? `/api/segments/${editingSegment.id}` : '/api/segments'
      const method = editingSegment ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: segmentName,
          conditions: validConditions
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${editingSegment ? 'update' : 'create'} segment`)
      }

      // Refresh the segments list
      await mutate('/api/segments')
      
      // Reset form and close creation modal
      setSegmentName('')
      setConditions([])
      setPreviewCount(null)
      setEditingSegment(null)
      setIsCreating(false)
    } catch (error) {
      console.error('Save failed:', error)
      setError(error instanceof Error ? error.message : `Failed to ${editingSegment ? 'update' : 'create'} segment`)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSegment = async (segmentId: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return
    
    try {
      const response = await fetch(`/api/segments/${segmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete segment')
      }

      // Refresh the segments list
      await mutate('/api/segments')
    } catch (error) {
      console.error('Delete failed:', error)
      setError('Failed to delete segment')
    }
  }

  const useInCampaign = (segment: Segment) => {
    // Store segment data in localStorage for the campaign creation page
    localStorage.setItem('selectedSegment', JSON.stringify({
      id: segment.id,
      name: segment.name,
      matchingContacts: segment.matchingContacts
    }))
    
    // Navigate to campaign creation page
    window.location.href = '/campaigns/new'
  }

  const buildConditionQuery = (conditions: Condition[]) => {
    return conditions.map((condition, index) => {
      const field = availableFields.find(f => f.key === condition.field)?.label || condition.field
      const operator = getOperatorsForField(condition.field).find(o => o.key === condition.operator)?.label || condition.operator
      
      return (
        <span key={condition.id} className="inline-flex items-center gap-1">
          {index > 0 && condition.logicalOperator && (
            <Badge variant="outline" className="mx-1">
              {condition.logicalOperator}
            </Badge>
          )}
          <Badge variant="secondary">
            {field} {operator} "{condition.value}"
          </Badge>
        </span>
      )
    })
  }

  if (isCreating) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={cancelEdit}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Segments
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {editingSegment ? 'Edit Segment' : 'Create Segment'}
            </h1>
            <p className="text-muted-foreground">
              {editingSegment ? 'Update your segment conditions' : 'Build a dynamic segment with custom conditions'}
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
          <Card>
            <CardHeader>
              <CardTitle>Segment Details</CardTitle>
              <CardDescription>
                Give your segment a name and description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="segment-name">Segment Name</Label>
                  <Input
                    id="segment-name"
                    placeholder="e.g., Engaged Leads - SaaS Industry"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>
                Define the criteria for contacts to be included in this segment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conditions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conditions added yet</p>
                  <p className="text-sm">Add a condition to start building your segment</p>
                </div>
              )}

              {conditions.map((condition, index) => (
                <div key={condition.id} className="border rounded-lg p-4 space-y-4">
                  {index > 0 && (
                    <div className="flex items-center gap-2">
                      <Label>Logical Operator</Label>
                      <select
                        value={condition.logicalOperator || 'AND'}
                        onChange={(e) => updateCondition(condition.id, { 
                          logicalOperator: e.target.value as 'AND' | 'OR' 
                        })}
                        className="px-3 py-1 border rounded"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Field</Label>
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(condition.id, { 
                          field: e.target.value,
                          operator: '',
                          value: ''
                        })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select field...</option>
                        {availableFields.map(field => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Operator</Label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                        className="w-full p-2 border rounded"
                        disabled={!condition.field}
                      >
                        <option value="">Select operator...</option>
                        {condition.field && getOperatorsForField(condition.field).map(operator => (
                          <option key={operator.key} value={operator.key}>
                            {operator.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Value</Label>
                      {condition.field === 'createdAt' ? (
                        <Input
                          type="date"
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          disabled={!condition.operator}
                        />
                      ) : (
                        <Input
                          placeholder="Enter value..."
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          disabled={!condition.operator}
                        />
                      )}
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </CardContent>
          </Card>

          {conditions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  See how many contacts match your criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Segment Query:</h4>
                  <div className="flex flex-wrap gap-1">
                    {buildConditionQuery(conditions.filter(c => c.field && c.operator && c.value))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button 
                    onClick={generatePreview} 
                    disabled={isLoadingPreview || conditions.filter(c => c.field && c.operator && c.value).length === 0}
                  >
                    {isLoadingPreview ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500 mr-2"></div>
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Matches
                      </>
                    )}
                  </Button>

                  {previewCount !== null && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-600">
                        {previewCount} contacts match
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={saveSegment}
              disabled={!segmentName || conditions.filter(c => c.field && c.operator && c.value).length === 0 || isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingSegment ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingSegment ? 'Update Segment' : 'Save Segment'}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Segments</h1>
            <p className="text-muted-foreground">
              Create dynamic segments based on contact properties and behavior
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Segments</CardTitle>
            <CardDescription>
              Your dynamic segments automatically update as contacts meet the criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading segments...</p>
              </div>
            ) : fetchError ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50 text-red-500" />
                <p>Failed to load segments</p>
                <p className="text-sm">Please try refreshing the page</p>
              </div>
            ) : !segments || segments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No segments created yet</p>
                <p className="text-sm">Create your first segment to organize your contacts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {segments.map(segment => (
                  <div key={segment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{segment.name}</h3>
                          {segment.isActive && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {buildConditionQuery(segment.conditions)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {segment.matchingContacts.toLocaleString()} contacts
                          </span>
                          <span>Created {new Date(segment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => startEdit(segment)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => useInCampaign(segment)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Use in Campaign
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteSegment(segment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 