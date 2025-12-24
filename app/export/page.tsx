'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { parseCsvBlob, parseExcelBlob, ParsedFile } from '@/lib/parseFile'
import { Card, Button } from '@/components/ui'
import * as XLSX from 'xlsx'

interface ExportData {
  headers: string[]
  rows: (string | number)[][]
  fileName: string
  fileType: string
  rowCount: number
}

type ExportFormat = 'json' | 'csv' | 'xlsx' | 'xml' | 'markdown'

interface FormatOption {
  id: ExportFormat
  name: string
  description: string
  icon: string
  mimeType: string
  extension: string
}

const FORMATS: FormatOption[] = [
  {
    id: 'json',
    name: 'JSON',
    description: 'JavaScript Object Notation - structured data format',
    icon: 'code',
    mimeType: 'application/json',
    extension: 'json',
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'Comma-separated values - compatible with Excel and databases',
    icon: 'table_chart',
    mimeType: 'text/csv',
    extension: 'csv',
  },
  {
    id: 'xlsx',
    name: 'Excel',
    description: 'Microsoft Excel format (.xlsx)',
    icon: 'description',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
  {
    id: 'xml',
    name: 'XML',
    description: 'Extensible Markup Language - structured data format',
    icon: 'code',
    mimeType: 'application/xml',
    extension: 'xml',
  },
  {
    id: 'markdown',
    name: 'Markdown Table',
    description: 'Markdown formatted table - great for documentation',
    icon: 'text_fields',
    mimeType: 'text/markdown',
    extension: 'md',
  },
]

export default function ExportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [data, setData] = useState<ExportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    const path = searchParams.get('path')
    const name = searchParams.get('name') || 'file'
    const type = searchParams.get('type') || ''

    if (path) {
      loadAndParseFile(path, name, type)
    } else {
      router.push('/dashboard')
    }
  }, [loading, user, searchParams, router])

  const loadAndParseFile = async (filePath: string, fileName: string, fileType: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('files')
        .download(filePath)

      if (downloadError) {
        throw downloadError
      }

      if (!fileData) {
        throw new Error('File not found')
      }

      const extension = fileName.split('.').pop()?.toLowerCase()
      let parsed: ParsedFile

      if (extension === 'csv') {
        parsed = await parseCsvBlob(fileData)
      } else if (extension === 'xlsx' || extension === 'xls') {
        parsed = await parseExcelBlob(fileData)
      } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel files.')
      }

      setData({
        headers: parsed.headers,
        rows: parsed.rows,
        fileName,
        fileType,
        rowCount: parsed.rows.length,
      })

      setIsLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load file')
      setIsLoading(false)
    }
  }

  const escapeCsvCell = (cell: string | number): string => {
    const cellStr = String(cell ?? '')
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
      return `"${cellStr.replace(/"/g, '""')}"`
    }
    return cellStr
  }

  const exportToFormat = async (format: ExportFormat) => {
    if (!data) return

    setExportingFormat(format)
    try {
      const baseFileName = data.fileName.replace(/\.[^/.]+$/, '')
      const formatInfo = FORMATS.find((f) => f.id === format)!
      let blob: Blob
      let fileName: string

      switch (format) {
        case 'json': {
          const jsonData = {
            metadata: {
              fileName: data.fileName,
              rowCount: data.rowCount,
              columnCount: data.headers.length,
              exportedAt: new Date().toISOString(),
            },
            headers: data.headers,
            rows: data.rows.map((row) => {
              const obj: { [key: string]: string | number } = {}
              data.headers.forEach((header, index) => {
                obj[header || `Column${index + 1}`] = row[index] ?? ''
              })
              return obj
            }),
          }
          blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: formatInfo.mimeType })
          fileName = `${baseFileName}.${formatInfo.extension}`
          break
        }

        case 'csv': {
          const csvRows = [
            data.headers.map(escapeCsvCell).join(','),
            ...data.rows.map((row) => row.map(escapeCsvCell).join(',')),
          ]
          const csvContent = csvRows.join('\n')
          blob = new Blob([csvContent], { type: formatInfo.mimeType })
          fileName = `${baseFileName}.${formatInfo.extension}`
          break
        }

        case 'xlsx': {
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows])
          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          blob = new Blob([excelBuffer], { type: formatInfo.mimeType })
          fileName = `${baseFileName}.${formatInfo.extension}`
          break
        }

        case 'xml': {
          const xmlRows = data.rows
            .map((row) => {
              const cells = row
                .map((cell, index) => {
                  const header = data.headers[index] || `Column${index + 1}`
                  const value = String(cell ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  return `    <${header}>${value}</${header}>`
                })
                .join('\n')
              return `  <row>\n${cells}\n  </row>`
            })
            .join('\n')

          const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <metadata>
    <fileName>${data.fileName}</fileName>
    <rowCount>${data.rowCount}</rowCount>
    <columnCount>${data.headers.length}</columnCount>
    <exportedAt>${new Date().toISOString()}</exportedAt>
  </metadata>
  <headers>
${data.headers.map((h) => `    <header>${h || ''}</header>`).join('\n')}
  </headers>
  <rows>
${xmlRows}
  </rows>
</data>`
          blob = new Blob([xmlContent], { type: formatInfo.mimeType })
          fileName = `${baseFileName}.${formatInfo.extension}`
          break
        }

        case 'markdown': {
          // Calculate column widths for alignment
          const colWidths = data.headers.map((header, colIndex) => {
            const headerLen = String(header || '').length
            const maxDataLen = Math.max(
              ...data.rows.map((row) => String(row[colIndex] ?? '').length),
              0
            )
            return Math.max(headerLen, maxDataLen, 3) // Min width of 3
          })

          // Build markdown table
          const headerRow = `| ${data.headers
            .map((h, i) => String(h || `Column ${i + 1}`).padEnd(colWidths[i]))
            .join(' | ')} |`
          const separatorRow = `| ${colWidths.map((w) => '-'.repeat(w)).join(' | ')} |`
          const dataRows = data.rows
            .map((row) => {
              return `| ${row
                .map((cell, i) => String(cell ?? '').padEnd(colWidths[i]))
                .join(' | ')} |`
            })
            .join('\n')

          const markdownContent = `# ${data.fileName}

**Exported:** ${new Date().toLocaleString()}  
**Rows:** ${data.rowCount}  
**Columns:** ${data.headers.length}

${headerRow}
${separatorRow}
${dataRows}
`
          blob = new Blob([markdownContent], { type: formatInfo.mimeType })
          fileName = `${baseFileName}.${formatInfo.extension}`
          break
        }
      }

      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(`Failed to export: ${err.message || 'Unknown error'}`)
    } finally {
      setExportingFormat(null)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-black/60">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="mb-4 flex items-center gap-2 text-xs text-black/60 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-light text-black tracking-tight mb-1">Export Formats</h1>
                <div className="flex items-center gap-3 text-xs text-black/60">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">description</span>
                    {data?.fileName || 'No file selected'}
                  </span>
                  {data && (
                    <>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">table_rows</span>
                        {data.rowCount.toLocaleString()} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">view_column</span>
                        {data.headers.length} columns
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 flex items-start gap-2">
              <span className="material-symbols-outlined text-sm text-red-600">error</span>
              <div className="flex-1">
                <p className="text-xs text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <Card className="border-black/10" padding="lg">
                <h2 className="text-sm font-medium text-black mb-4">Available Export Formats</h2>
                <p className="text-xs text-black/50 mb-6">
                  Choose a format below to download your data. All formats preserve the complete dataset.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FORMATS.map((format) => (
                    <Card
                      key={format.id}
                      className="border-black/10 hover:border-black/20 transition-all"
                      padding="md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-lg text-black/70">
                              {format.icon}
                            </span>
                            <h3 className="text-sm font-medium text-black">{format.name}</h3>
                          </div>
                          <p className="text-xs text-black/50 mb-3">{format.description}</p>
                          <div className="flex items-center gap-2 text-xs text-black/40">
                            <span className="material-symbols-outlined text-xs">file_present</span>
                            <span>.{format.extension}</span>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => exportToFormat(format.id)}
                          disabled={exportingFormat !== null}
                          icon={
                            <span className="material-symbols-outlined text-sm">
                              {exportingFormat === format.id ? 'hourglass_empty' : 'download'}
                            </span>
                          }
                        >
                          {exportingFormat === format.id ? 'Exporting...' : 'Export'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card className="border-black/10" padding="lg">
                <h2 className="text-sm font-medium text-black mb-4">Data Preview</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-black/10">
                        {data.headers.map((header, index) => (
                          <th
                            key={index}
                            className="text-left py-2 px-3 font-medium text-black/70 bg-black/5"
                          >
                            {header || `Column ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-black/5 hover:bg-black/5">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="py-2 px-3 text-black/70">
                              {String(cell ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.rows.length > 10 && (
                    <p className="text-xs text-black/40 mt-3 text-center">
                      Showing first 10 of {data.rowCount.toLocaleString()} rows
                    </p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
