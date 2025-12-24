'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { parseCsvBlob, parseExcelBlob, ParsedFile } from '@/lib/parseFile'
import { Card, Button, Select } from '@/components/ui'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface VisualizationData {
  headers: string[]
  rows: (string | number)[][]
  fileName: string
  fileType: string
  rowCount: number
}

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter'

const COLORS = ['#000000', '#666666', '#999999', '#cccccc', '#333333', '#555555']

export default function VisualizationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [data, setData] = useState<VisualizationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [xAxisColumn, setXAxisColumn] = useState<string>('')
  const [yAxisColumn, setYAxisColumn] = useState<string>('')
  const [groupByColumn, setGroupByColumn] = useState<string>('')
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

      // Auto-select first two columns if available
      if (parsed.headers.length >= 2) {
        setXAxisColumn(parsed.headers[0])
        setYAxisColumn(parsed.headers[1])
      } else if (parsed.headers.length === 1) {
        setXAxisColumn(parsed.headers[0])
      }

      setIsLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load file')
      setIsLoading(false)
    }
  }

  // Process data for charting
  const chartData = useMemo(() => {
    if (!data || !xAxisColumn || !yAxisColumn) return []

    const xIndex = data.headers.indexOf(xAxisColumn)
    const yIndex = data.headers.indexOf(yAxisColumn)

    if (xIndex === -1 || yIndex === -1) return []

    // For pie charts, we need different data structure
    if (chartType === 'pie') {
      const valueMap: { [key: string]: number } = {}
      data.rows.forEach((row) => {
        const key = String(row[xIndex] || '')
        const value = Number(row[yIndex]) || 0
        valueMap[key] = (valueMap[key] || 0) + value
      })
      return Object.entries(valueMap).map(([name, value]) => ({ name, value }))
    }

    // For scatter charts
    if (chartType === 'scatter') {
      return data.rows
        .filter((row) => {
          const xVal = row[xIndex]
          const yVal = row[yIndex]
          return xVal !== undefined && xVal !== null && yVal !== undefined && yVal !== null
        })
        .map((row) => ({
          x: Number(row[xIndex]) || 0,
          y: Number(row[yIndex]) || 0,
        }))
    }

    // For bar, line, area charts - aggregate if groupBy is set
    if (groupByColumn) {
      const groupIndex = data.headers.indexOf(groupByColumn)
      if (groupIndex === -1) return []

      const grouped: { [key: string]: { [key: string]: number } } = {}
      data.rows.forEach((row) => {
        const groupKey = String(row[groupIndex] || '')
        const xKey = String(row[xIndex] || '')
        const yVal = Number(row[yIndex]) || 0

        if (!grouped[groupKey]) {
          grouped[groupKey] = {}
        }
        grouped[groupKey][xKey] = (grouped[groupKey][xKey] || 0) + yVal
      })

      // Convert to chart format
      const allXKeys = new Set<string>()
      Object.values(grouped).forEach((group) => {
        Object.keys(group).forEach((key) => allXKeys.add(key))
      })

      return Array.from(allXKeys).map((xKey) => {
        const item: any = { name: xKey }
        Object.keys(grouped).forEach((groupKey) => {
          item[groupKey] = grouped[groupKey][xKey] || 0
        })
        return item
      })
    }

    // Simple aggregation by X axis
    const valueMap: { [key: string]: number } = {}
    data.rows.forEach((row) => {
      const key = String(row[xIndex] || '')
      const value = Number(row[yIndex]) || 0
      valueMap[key] = (valueMap[key] || 0) + value
    })

    return Object.entries(valueMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        // Try to sort numerically if possible
        const aNum = Number(a.name)
        const bNum = Number(b.name)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        return a.name.localeCompare(b.name)
      })
  }, [data, xAxisColumn, yAxisColumn, groupByColumn, chartType])

  // Get unique groups for legend
  const groups = useMemo(() => {
    if (!groupByColumn || !data) return []
    const groupIndex = data.headers.indexOf(groupByColumn)
    if (groupIndex === -1) return []

    const uniqueGroups = new Set<string>()
    data.rows.forEach((row) => {
      const group = String(row[groupIndex] || '')
      if (group) uniqueGroups.add(group)
    })
    return Array.from(uniqueGroups)
  }, [data, groupByColumn])

  const columnOptions = data
    ? data.headers.map((header, index) => ({
        value: header,
        label: header || `Column ${index + 1}`,
      }))
    : []

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
        <div className="max-w-7xl mx-auto">
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
                <h1 className="text-2xl font-light text-black tracking-tight mb-1">Data Visualization</h1>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Configuration */}
              <div className="space-y-4">
                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-4">Chart Configuration</h2>
                  <div className="space-y-4">
                    <Select
                      label="Chart Type"
                      options={[
                        { value: 'bar', label: 'Bar Chart' },
                        { value: 'line', label: 'Line Chart' },
                        { value: 'area', label: 'Area Chart' },
                        { value: 'pie', label: 'Pie Chart' },
                        { value: 'scatter', label: 'Scatter Plot' },
                      ]}
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as ChartType)}
                    />

                    <Select
                      label="X-Axis (Category)"
                      options={columnOptions}
                      value={xAxisColumn}
                      onChange={(e) => setXAxisColumn(e.target.value)}
                      placeholder="Select column..."
                    />

                    {chartType !== 'pie' && (
                      <Select
                        label="Y-Axis (Value)"
                        options={columnOptions}
                        value={yAxisColumn}
                        onChange={(e) => setYAxisColumn(e.target.value)}
                        placeholder="Select column..."
                      />
                    )}

                    {chartType !== 'pie' && chartType !== 'scatter' && (
                      <Select
                        label="Group By (Optional)"
                        options={[{ value: '', label: 'None' }, ...columnOptions]}
                        value={groupByColumn}
                        onChange={(e) => setGroupByColumn(e.target.value)}
                        helperText="Create multiple series grouped by this column"
                      />
                    )}
                  </div>
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
                    {chartData.length > 0 && (
                      <p>
                        <span className="font-medium text-black/70">Data Points:</span> {chartData.length}
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right: Chart Display */}
              <div className="lg:col-span-2">
                <Card className="border-black/10" padding="lg">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-black">Chart Preview</h2>
                    {chartData.length === 0 && xAxisColumn && yAxisColumn && (
                      <p className="text-xs text-black/50">No data to display. Check your column selections.</p>
                    )}
                  </div>

                  {!xAxisColumn || !yAxisColumn ? (
                    <div className="h-96 flex items-center justify-center border border-black/5 bg-black/5">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-black/20 mb-2 inline-block">
                          bar_chart
                        </span>
                        <p className="text-xs text-black/50">Select X and Y axes to generate chart</p>
                      </div>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-96 flex items-center justify-center border border-black/5 bg-black/5">
                      <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-black/20 mb-2 inline-block">
                          error_outline
                        </span>
                        <p className="text-xs text-black/50">No valid data found for selected columns</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' && (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend fontSize={12} />
                            {groupByColumn && groups.length > 0 ? (
                              groups.map((group, index) => (
                                <Bar key={group} dataKey={group} fill={COLORS[index % COLORS.length]} />
                              ))
                            ) : (
                              <Bar dataKey="value" fill="#000000" />
                            )}
                          </BarChart>
                        )}

                        {chartType === 'line' && (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend fontSize={12} />
                            {groupByColumn && groups.length > 0 ? (
                              groups.map((group, index) => (
                                <Line
                                  key={group}
                                  type="monotone"
                                  dataKey={group}
                                  stroke={COLORS[index % COLORS.length]}
                                  strokeWidth={2}
                                />
                              ))
                            ) : (
                              <Line type="monotone" dataKey="value" stroke="#000000" strokeWidth={2} />
                            )}
                          </LineChart>
                        )}

                        {chartType === 'area' && (
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend fontSize={12} />
                            {groupByColumn && groups.length > 0 ? (
                              groups.map((group, index) => (
                                <Area
                                  key={group}
                                  type="monotone"
                                  dataKey={group}
                                  stackId="1"
                                  stroke={COLORS[index % COLORS.length]}
                                  fill={COLORS[index % COLORS.length]}
                                  fillOpacity={0.6}
                                />
                              ))
                            ) : (
                              <Area type="monotone" dataKey="value" stroke="#000000" fill="#000000" fillOpacity={0.6} />
                            )}
                          </AreaChart>
                        )}

                        {chartType === 'pie' && (
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <Legend fontSize={12} />
                          </PieChart>
                        )}

                        {chartType === 'scatter' && (
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                              type="number"
                              dataKey="x"
                              name={xAxisColumn}
                              stroke="#666"
                              fontSize={12}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              name={yAxisColumn}
                              stroke="#666"
                              fontSize={12}
                            />
                            <Tooltip
                              cursor={{ strokeDasharray: '3 3' }}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                fontSize: '12px',
                              }}
                            />
                            <Scatter name="Data Points" data={chartData} fill="#000000" />
                          </ScatterChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
