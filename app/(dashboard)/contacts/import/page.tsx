'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, ArrowLeft, Download, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'

interface CSVRow {
  [key: string]: string
}

interface FieldMapping {
  csvColumn: string
  platformField: string
  isCustomField?: boolean
}

interface ValidationError {
  row: number
  column: string
  value: string
  error: string
}

export default function ContactImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'mapping' | 'validation' | 'importing' | 'complete'>('upload')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importSummary, setImportSummary] = useState<{
    added: number
    skipped: number
    failed: number
  } | null>(null)

  const platformFields = [
    { key: 'email', label: 'Email Address', required: true },
    { key: 'firstName', label: 'First Name', required: false },
    { key: 'lastName', label: 'Last Name', required: false },
    { key: 'companyName', label: 'Company Name', required: false },
    { key: 'jobTitle', label: 'Job Title', required: false },
    { key: 'source', label: 'Source', required: false },
  ]

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    
    // Parse CSV file
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })

    setCsvHeaders(headers)
    setCsvData(rows)
    
    // Initialize field mappings
    const initialMappings = headers.map(header => ({
      csvColumn: header,
      platformField: detectFieldMapping(header),
      isCustomField: false
    }))
    setFieldMappings(initialMappings)
    
    setStep('mapping')
  }, [])

  const detectFieldMapping = (header: string): string => {
    const headerLower = header.toLowerCase()
    if (headerLower.includes('email')) return 'email'
    if (headerLower.includes('first') && headerLower.includes('name')) return 'firstName'
    if (headerLower.includes('last') && headerLower.includes('name')) return 'lastName'
    if (headerLower.includes('company')) return 'companyName'
    if (headerLower.includes('job') || headerLower.includes('title')) return 'jobTitle'
    if (headerLower.includes('source')) return 'source'
    return ''
  }

  const updateFieldMapping = (csvColumn: string, platformField: string) => {
    setFieldMappings(prev => prev.map(mapping => 
      mapping.csvColumn === csvColumn 
        ? { ...mapping, platformField }
        : mapping
    ))
  }

  const validateData = () => {
    const errors: ValidationError[] = []
    const emailMapping = fieldMappings.find(m => m.platformField === 'email')
    
    if (!emailMapping) {
      alert('Email field mapping is required')
      return
    }

    csvData.forEach((row, index) => {
      const email = row[emailMapping.csvColumn]
      if (!email) {
        errors.push({
          row: index + 2, // +2 because we skip header and use 1-based indexing
          column: emailMapping.csvColumn,
          value: '',
          error: 'Email is required'
        })
      } else if (!isValidEmail(email)) {
        errors.push({
          row: index + 2,
          column: emailMapping.csvColumn,
          value: email,
          error: 'Invalid email format'
        })
      }
    })

    setValidationErrors(errors)
    setStep('validation')
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const proceedWithImport = async () => {
    setStep('importing')
    
    try {
      // Prepare the data for bulk import
      const validContacts = csvData.filter((_, index) => {
        return !validationErrors.some(error => error.row === index + 2)
      })

      // Map CSV data to contact format based on field mappings
      const contactsToImport = validContacts.map(row => {
        const contact: any = {}
        
        fieldMappings.forEach(mapping => {
          if (mapping.platformField && row[mapping.csvColumn]) {
            contact[mapping.platformField] = row[mapping.csvColumn]
          }
        })
        
        return contact
      })

      // Send POST request to the backend
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: contactsToImport,
          // organizationId is now handled automatically by the backend
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to import contacts')
      }

      const result = await response.json()
      
      setImportSummary({
        added: result.results?.imported || contactsToImport.length,
        skipped: result.results?.skipped || 0,
        failed: result.results?.errors?.length || validationErrors.length
      })
      
      // Invalidate SWR cache to refresh contact stats
      await mutate('/api/contacts/stats')
      await mutate('/api/contacts')
      
      setStep('complete')
    } catch (error) {
      console.error('Import failed:', error)
      // Handle error - show error to user but still show summary
      setImportSummary({
        added: 0,
        skipped: 0,
        failed: csvData.length
      })
      setStep('complete')
    }
  }

  const startOver = () => {
    setCsvFile(null)
    setCsvData([])
    setCsvHeaders([])
    setFieldMappings([])
    setValidationErrors([])
    setImportSummary(null)
    setStep('upload')
  }

  const handleViewContacts = () => {
    // Trigger one more cache refresh before navigating
    mutate('/api/contacts/stats')
    router.push('/contacts')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Contacts</h1>
          <p className="text-muted-foreground">Upload a CSV file to import your contacts</p>
        </div>
      </div>

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file containing your contacts. The first row should contain column headers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <Label htmlFor="csv-upload" className="text-lg font-medium cursor-pointer">
                  Choose CSV file
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-sm text-gray-500">
                  Drag and drop your CSV file here, or click to browse
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• First row must contain column headers</li>
                <li>• Email column is required</li>
                <li>• Supported columns: Email, First Name, Last Name, Company, Job Title, Source</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to platform fields. Email field is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {csvHeaders.map((header) => {
                const mapping = fieldMappings.find(m => m.csvColumn === header)
                return (
                  <div key={header} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{header}</Label>
                      <p className="text-xs text-gray-500">
                        Sample: {csvData[0]?.[header] || 'No data'}
                      </p>
                    </div>
                    <div className="flex-1">
                      <select
                        value={mapping?.platformField || ''}
                        onChange={(e) => updateFieldMapping(header, e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Select field...</option>
                        {platformFields.map(field => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required ? '*' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={validateData}>
                Continue to Validation
              </Button>
              <Button variant="outline" onClick={startOver}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'validation' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationErrors.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Data Validation
            </CardTitle>
            <CardDescription>
              {validationErrors.length > 0 
                ? `Found ${validationErrors.length} validation errors`
                : 'All data looks good!'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {validationErrors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Validation Errors:</h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {validationErrors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Row {error.row}: {error.error} in column "{error.column}"
                        {error.value && ` (value: "${error.value}")`}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border rounded-lg p-4">
              <h3 className="font-medium mb-2">Import Summary</h3>
              <div className="text-sm space-y-1">
                <p>Total rows: {csvData.length}</p>
                <p>Valid rows: {csvData.length - validationErrors.length}</p>
                <p>Invalid rows: {validationErrors.length}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={proceedWithImport} disabled={csvData.length === validationErrors.length}>
                Import Valid Contacts
              </Button>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button variant="outline" onClick={startOver}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'importing' && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Contacts...</CardTitle>
            <CardDescription>
              Please wait while we import your contacts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && importSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Complete
            </CardTitle>
            <CardDescription>
              Your contacts have been imported successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{importSummary.added}</div>
                <div className="text-sm text-green-700">Contacts Added</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{importSummary.skipped}</div>
                <div className="text-sm text-yellow-700">Contacts Skipped</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{importSummary.failed}</div>
                <div className="text-sm text-red-700">Contacts Failed</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleViewContacts}>
                View Contacts
              </Button>
              <Button variant="outline" onClick={startOver}>
                Import More Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 