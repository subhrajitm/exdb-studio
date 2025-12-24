'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { parseCsvBlob, parseExcelBlob, ParsedFile } from '@/lib/parseFile'
import { Card, Button, Input, Select } from '@/components/ui'

interface ConverterData {
  headers: string[]
  rows: (string | number)[][]
  fileName: string
  fileType: string
  rowCount: number
}

type DBType = 'sql' | 'mongodb' | 'postgresql' | 'mysql' | 'sqlite'

interface DBTypeOption {
  id: DBType
  name: string
  description: string
  icon: string
  extension: string
}

const DB_TYPES: DBTypeOption[] = [
  {
    id: 'sql',
    name: 'Standard SQL',
    description: 'Generic SQL with CREATE TABLE and INSERT statements',
    icon: 'database',
    extension: 'sql',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'PostgreSQL-specific SQL syntax',
    icon: 'database',
    extension: 'sql',
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'MySQL/MariaDB-specific SQL syntax',
    icon: 'database',
    extension: 'sql',
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'SQLite-specific SQL syntax',
    icon: 'database',
    extension: 'sql',
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'MongoDB insertMany JSON format',
    icon: 'storage',
    extension: 'js',
  },
]

export default function DBConverterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [data, setData] = useState<ConverterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDBType, setSelectedDBType] = useState<DBType>('sql')
  const [tableName, setTableName] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
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

  useEffect(() => {
    if (data) {
      // Auto-generate table name from filename
      const baseName = data.fileName.replace(/\.[^/.]+$/, '').toLowerCase()
      const sanitized = baseName.replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
      setTableName(sanitized || 'table')
    }
  }, [data])

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

  const sanitizeColumnName = (name: string, index: number): string => {
    if (!name || name.trim() === '') {
      return `column_${index + 1}`
    }
    // Remove special characters, keep only alphanumeric and underscores
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `column_${index + 1}`
  }

  const inferColumnType = (columnIndex: number): string => {
    if (!data) return 'TEXT'
    const sampleValues = data.rows
      .slice(0, 100)
      .map((row) => row[columnIndex])
      .filter((val) => val !== undefined && val !== null && val !== '')

    if (sampleValues.length === 0) return 'TEXT'

    const allNumeric = sampleValues.every((val) => {
      const num = Number(val)
      return !isNaN(num) && isFinite(num)
    })

    if (allNumeric) {
      const allIntegers = sampleValues.every((val) => {
        const num = Number(val)
        return Number.isInteger(num)
      })
      return allIntegers ? 'INTEGER' : 'REAL'
    }

    // Check for dates
    const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/
    if (sampleValues.some((val) => datePattern.test(String(val)))) {
      return 'DATE'
    }

    return 'TEXT'
  }

  const escapeSQLString = (value: string | number, dbType: DBType): string => {
    if (value === null || value === undefined) {
      return 'NULL'
    }

    const str = String(value)
    // Escape single quotes
    const escaped = str.replace(/'/g, "''")
    return `'${escaped}'`
  }

  const generateSQL = (dbType: DBType): string => {
    if (!data || !tableName) return ''

    const sanitizedTableName = tableName.replace(/[^a-z0-9_]/gi, '_')
    const columns = data.headers.map((header, index) => ({
      name: sanitizeColumnName(header, index),
      type: inferColumnType(index),
      originalName: header || `Column ${index + 1}`,
    }))

    let sql = ''

    // Generate CREATE TABLE statement
    if (dbType === 'postgresql') {
      sql += `-- PostgreSQL CREATE TABLE statement\n`
      sql += `CREATE TABLE IF NOT EXISTS ${sanitizedTableName} (\n`
      sql += columns
        .map((col) => {
          let pgType = 'TEXT'
          if (col.type === 'INTEGER') pgType = 'INTEGER'
          else if (col.type === 'REAL') pgType = 'NUMERIC'
          else if (col.type === 'DATE') pgType = 'DATE'
          return `  ${col.name} ${pgType}`
        })
        .join(',\n')
      sql += '\n);\n\n'
    } else if (dbType === 'mysql') {
      sql += `-- MySQL CREATE TABLE statement\n`
      sql += `CREATE TABLE IF NOT EXISTS ${sanitizedTableName} (\n`
      sql += columns
        .map((col) => {
          let mysqlType = 'TEXT'
          if (col.type === 'INTEGER') mysqlType = 'INT'
          else if (col.type === 'REAL') mysqlType = 'DECIMAL(10,2)'
          else if (col.type === 'DATE') mysqlType = 'DATE'
          else mysqlType = 'VARCHAR(255)'
          return `  ${col.name} ${mysqlType}`
        })
        .join(',\n')
      sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n'
    } else if (dbType === 'sqlite') {
      sql += `-- SQLite CREATE TABLE statement\n`
      sql += `CREATE TABLE IF NOT EXISTS ${sanitizedTableName} (\n`
      sql += columns
        .map((col) => {
          let sqliteType = col.type
          if (col.type === 'REAL') sqliteType = 'REAL'
          else if (col.type === 'INTEGER') sqliteType = 'INTEGER'
          else sqliteType = 'TEXT'
          return `  ${col.name} ${sqliteType}`
        })
        .join(',\n')
      sql += '\n);\n\n'
    } else {
      // Standard SQL
      sql += `-- Standard SQL CREATE TABLE statement\n`
      sql += `CREATE TABLE IF NOT EXISTS ${sanitizedTableName} (\n`
      sql += columns
        .map((col) => `  ${col.name} ${col.type}`)
        .join(',\n')
      sql += '\n);\n\n'
    }

    // Generate INSERT statements
    sql += `-- INSERT statements\n`
    const columnNames = columns.map((col) => col.name).join(', ')

    // Batch inserts for better performance
    const batchSize = dbType === 'mysql' ? 1000 : 100
    for (let i = 0; i < data.rows.length; i += batchSize) {
      const batch = data.rows.slice(i, i + batchSize)
      const values = batch
        .map((row) => {
          const rowValues = columns
            .map((col, colIndex) => {
              const value = row[colIndex]
              if (value === null || value === undefined || value === '') {
                return 'NULL'
              }
              const numValue = Number(value)
              if (!isNaN(numValue) && isFinite(numValue)) {
                return String(numValue)
              }
              return escapeSQLString(value, dbType)
            })
            .join(', ')
          return `(${rowValues})`
        })
        .join(',\n  ')

      if (dbType === 'mysql') {
        sql += `INSERT INTO ${sanitizedTableName} (${columnNames}) VALUES\n  ${values};\n\n`
      } else {
        sql += `INSERT INTO ${sanitizedTableName} (${columnNames}) VALUES\n  ${values};\n\n`
      }
    }

    return sql
  }

  const generateMongoDB = (): string => {
    if (!data || !tableName) return ''

    const sanitizedCollectionName = tableName.replace(/[^a-z0-9_]/gi, '_')
    const columns = data.headers.map((header, index) => ({
      name: sanitizeColumnName(header, index),
      originalName: header || `Column ${index + 1}`,
    }))

    let js = `// MongoDB insertMany script\n`
    js += `// Collection: ${sanitizedCollectionName}\n\n`
    js += `db.${sanitizedCollectionName}.insertMany([\n`

    const documents = data.rows.map((row) => {
      const doc: { [key: string]: any } = {}
      columns.forEach((col, colIndex) => {
        const value = row[colIndex]
        if (value !== null && value !== undefined && value !== '') {
          const numValue = Number(value)
          if (!isNaN(numValue) && isFinite(numValue)) {
            doc[col.name] = Number.isInteger(numValue) ? numValue : numValue
          } else {
            doc[col.name] = String(value)
          }
        }
      })
      return doc
    })

    js += documents
      .map((doc, index) => {
        const jsonStr = JSON.stringify(doc, null, 2)
          .split('\n')
          .map((line, i) => (i === 0 ? line : '  ' + line))
          .join('\n')
        return `  ${jsonStr}${index < documents.length - 1 ? ',' : ''}`
      })
      .join('\n')

    js += `\n]);\n`

    return js
  }

  const handleGenerate = () => {
    if (!data || !tableName) return

    setIsGenerating(true)
    try {
      const dbTypeInfo = DB_TYPES.find((t) => t.id === selectedDBType)!
      let content: string

      if (selectedDBType === 'mongodb') {
        content = generateMongoDB()
      } else {
        content = generateSQL(selectedDBType)
      }

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tableName}.${dbTypeInfo.extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(`Failed to generate script: ${err.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const previewScript = useMemo(() => {
    if (!data || !tableName) return ''
    if (selectedDBType === 'mongodb') {
      return generateMongoDB().split('\n').slice(0, 20).join('\n') + '\n  ...\n'
    }
    return generateSQL(selectedDBType).split('\n').slice(0, 30).join('\n') + '\n  ...\n'
  }, [data, tableName, selectedDBType])

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
                <h1 className="text-2xl font-light text-black tracking-tight mb-1">DB Converter</h1>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Configuration */}
              <div className="space-y-4">
                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-4">Database Configuration</h2>
                  <div className="space-y-4">
                    <Select
                      label="Database Type"
                      options={DB_TYPES.map((db) => ({
                        value: db.id,
                        label: db.name,
                      }))}
                      value={selectedDBType}
                      onChange={(e) => setSelectedDBType(e.target.value as DBType)}
                    />

                    <Input
                      label="Table/Collection Name"
                      id="table-name"
                      value={tableName}
                      onChange={(e) => {
                        const sanitized = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, '_')
                          .replace(/_+/g, '_')
                          .replace(/^_|_$/g, '')
                        setTableName(sanitized || 'table')
                      }}
                      placeholder="e.g. users, products, orders"
                      helperText="Only letters, numbers, and underscores allowed"
                    />

                    <div className="pt-2">
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={handleGenerate}
                        disabled={!tableName || isGenerating}
                        icon={
                          <span className="material-symbols-outlined text-sm">
                            {isGenerating ? 'hourglass_empty' : 'download'}
                          </span>
                        }
                      >
                        {isGenerating ? 'Generating...' : 'Generate & Download Script'}
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-2">Column Mapping</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.headers.map((header, index) => {
                      const sanitized = sanitizeColumnName(header, index)
                      const inferredType = inferColumnType(index)
                      return (
                        <div key={index} className="flex items-center justify-between text-xs py-1.5 border-b border-black/5">
                          <div className="flex-1">
                            <p className="font-medium text-black/70">{header || `Column ${index + 1}`}</p>
                            <p className="text-black/50">→ {sanitized} ({inferredType})</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <Card className="border-black/10" padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-black">Script Preview</h2>
                    <span className="text-xs text-black/50">
                      {DB_TYPES.find((t) => t.id === selectedDBType)?.name}
                    </span>
                  </div>
                  <div className="bg-black/5 border border-black/10 rounded p-3 max-h-96 overflow-auto">
                    <pre className="text-xs font-mono text-black/70 whitespace-pre-wrap break-words">
                      {previewScript || 'Configure settings and generate script to see preview...'}
                    </pre>
                  </div>
                  <p className="text-xs text-black/40 mt-2">
                    Preview shows first 20-30 lines. Full script will be downloaded.
                  </p>
                </Card>

                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-2">Data Summary</h2>
                  <div className="space-y-2 text-xs text-black/60">
                    <p>
                      <span className="font-medium text-black/70">Rows:</span> {data.rowCount.toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium text-black/70">Columns:</span> {data.headers.length}
                    </p>
                    <p>
                      <span className="font-medium text-black/70">Table Name:</span> {tableName || 'Not set'}
                    </p>
                    <p className="pt-2 text-black/50">
                      The script will include CREATE TABLE and INSERT statements for all {data.rowCount.toLocaleString()}{' '}
                      rows.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
