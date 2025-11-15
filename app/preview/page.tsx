'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { DataEditor, GridCell, GridColumn, Item, EditableGridCell, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

interface PreviewData {
  headers: string[]
  rows: (string | number)[][]
  fileName: string
  fileType: string
  rowCount: number
}

export default function PreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRows, setSelectedRows] = useState<CompactSelection>(CompactSelection.empty())
  const [gridWidth, setGridWidth] = useState(1200)
  const supabase = createClient()

  useEffect(() => {
    const updateWidth = () => {
      setGridWidth(Math.max(800, window.innerWidth - 100))
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (previewData) {
      setIsLoading(false)
      setError(null)
      return
    }

    const filePath = searchParams.get('path')
    const fileName = searchParams.get('name') || 'file'
    const fileType = searchParams.get('type') || ''

    if (filePath && user) {
      loadAndParseFile(filePath, fileName, fileType)
    } else {
      const storedData = sessionStorage.getItem('previewData')
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData)
          setPreviewData(parsed)
          setError(null)
          setIsLoading(false)
          sessionStorage.removeItem('previewData')
        } catch (err) {
          setError('Failed to load preview data')
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
        setError('No file data found')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id])

  const loadAndParseFile = async (filePath: string, fileName: string, fileType: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: downloadError } = await supabase.storage
        .from('files')
        .download(filePath)

      if (downloadError) {
        throw downloadError
      }

      if (!data) {
        throw new Error('File not found')
      }

      const extension = fileName.split('.').pop()?.toLowerCase()
      let parsedData: PreviewData

      if (extension === 'csv') {
        parsedData = await parseCSV(data, fileName, fileType)
      } else if (extension === 'xlsx' || extension === 'xls') {
        parsedData = await parseExcel(data, fileName, fileType)
      } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel files.')
      }

      setPreviewData(parsedData)
      setIsLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load file')
      setIsLoading(false)
    }
  }

  const parseCSV = async (file: Blob, fileName: string, fileType: string): Promise<PreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          Papa.parse(text, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
              const rows = results.data as (string | number)[][]
              if (rows.length === 0) {
                reject(new Error('CSV file is empty'))
                return
              }

              const headers = rows[0] as string[]
              const dataRows = rows.slice(1)

              resolve({
                headers,
                rows: dataRows,
                fileName,
                fileType,
                rowCount: dataRows.length,
              })
            },
            error: (error) => {
              reject(error)
            },
          })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read CSV file'))
      reader.readAsText(file)
    })
  }

  const parseExcel = async (file: Blob, fileName: string, fileType: string): Promise<PreviewData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'))
            return
          }

          const headers = (jsonData[0] as any[]).map((h) => String(h || ''))
          const rows = jsonData.slice(1) as (string | number)[][]

          resolve({
            headers,
            rows,
            fileName,
            fileType,
            rowCount: rows.length,
          })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read Excel file'))
      reader.readAsArrayBuffer(file)
    })
  }

  // Convert headers to GridColumn format
  const getColumns = (): GridColumn[] => {
    if (!previewData) return []
    
    return previewData.headers.map((header, index) => ({
      title: header || `Column ${index + 1}`,
      id: `col-${index}`,
      width: 150,
    }))
  }

  // Get cell content for Glide Data Grid
  const getCellContent = useCallback((cell: Item): GridCell => {
    const [col, row] = cell

    if (!previewData) {
      return {
        kind: 'text',
        data: '',
        displayData: '',
        allowOverlay: true,
      }
    }

    // Data cells (Glide Data Grid handles headers automatically via columns)
    const cellValue = previewData.rows[row]?.[col]
    const displayValue = cellValue !== undefined && cellValue !== null ? String(cellValue) : ''

    return {
      kind: 'text',
      data: displayValue,
      displayData: displayValue,
      allowOverlay: true,
      readonly: false,
    }
  }, [previewData])

  // Handle cell editing
  const onCellEdited = useCallback((cell: Item, newValue: EditableGridCell): void => {
    if (!previewData) return

    const [col, row] = cell

    // Editing data cell
    if (row >= 0 && newValue.kind === 'text') {
      const newRows = [...previewData.rows]
      if (!newRows[row]) {
        newRows[row] = new Array(previewData.headers.length).fill('')
      }
      newRows[row][col] = newValue.data

      setPreviewData({
        ...previewData,
        rows: newRows,
      })
      setHasChanges(true)
    }
  }, [previewData])

  // Handle adding new row
  const handleAddRow = () => {
    if (!previewData) return

    const newRow = new Array(previewData.headers.length).fill('')
    const newRows = [...previewData.rows, newRow]

    setPreviewData({
      ...previewData,
      rows: newRows,
      rowCount: newRows.length,
    })
    setHasChanges(true)
  }

  // Handle deleting selected rows
  const handleDeleteRows = () => {
    if (!previewData || selectedRows.length === 0) return

    if (confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`)) {
      const indicesToDelete = Array.from(selectedRows)
        .filter(idx => idx >= 0 && idx < previewData.rows.length)
        .sort((a, b) => b - a) // Sort descending to delete from end first

      const newRows = previewData.rows.filter((_, idx) => !indicesToDelete.includes(idx))

      setPreviewData({
        ...previewData,
        rows: newRows,
        rowCount: newRows.length,
      })
      setSelectedRows(CompactSelection.empty())
      setHasChanges(true)
    }
  }

  // Handle adding new column
  const handleAddColumn = () => {
    if (!previewData) return

    const newHeaderName = `Column ${previewData.headers.length + 1}`
    const newHeaders = [...previewData.headers, newHeaderName]
    const newRows = previewData.rows.map((row) => [...row, ''])

    setPreviewData({
      ...previewData,
      headers: newHeaders,
      rows: newRows,
    })
    setHasChanges(true)
  }

  // Handle deleting selected column
  const handleDeleteColumn = (colIndex: number) => {
    if (!previewData) return

    if (previewData.headers.length <= 1) {
      alert('Cannot delete the last column')
      return
    }

    if (confirm('Are you sure you want to delete this column? All data in this column will be lost.')) {
      const newHeaders = previewData.headers.filter((_, idx) => idx !== colIndex)
      const newRows = previewData.rows.map((row) => row.filter((_, idx) => idx !== colIndex))

      setPreviewData({
        ...previewData,
        headers: newHeaders,
        rows: newRows,
      })
      setHasChanges(true)
    }
  }

  // Handle save changes
  const handleSaveChanges = () => {
    if (!previewData) return

    try {
      const extension = previewData.fileName.split('.').pop()?.toLowerCase()
      let blob: Blob
      let mimeType: string
      let filename: string

      if (extension === 'csv') {
        const csvRows = [
          previewData.headers.join(','),
          ...previewData.rows.map((row) =>
            row.map((cell) => {
              const cellStr = String(cell ?? '')
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`
              }
              return cellStr
            }).join(',')
          ),
        ]
        const csvContent = csvRows.join('\n')
        blob = new Blob([csvContent], { type: 'text/csv' })
        mimeType = 'text/csv'
        filename = previewData.fileName.replace(/\.[^/.]+$/, '_edited.csv')
      } else {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([
          previewData.headers,
          ...previewData.rows,
        ])
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = previewData.fileName.replace(/\.[^/.]+$/, '_edited.xlsx')
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setHasChanges(false)
      alert('File downloaded successfully!')
    } catch (err) {
      setError('Failed to save changes')
      console.error(err)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-black/60">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const columns = getColumns()
  const numRows = previewData?.rowCount || 0

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-6 px-4">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-light text-black tracking-tight">
                Data Preview
              </h1>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save Changes
                  </button>
                )}
                <button
                  onClick={() => router.push('/upload')}
                  className="px-4 py-2 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300"
                >
                  Upload Another File
                </button>
              </div>
            </div>
            {previewData && (
              <div className="flex items-center gap-4 text-xs text-black/60">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">description</span>
                  {previewData.fileName}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">table_rows</span>
                  {previewData.rowCount.toLocaleString()} rows
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">view_column</span>
                  {previewData.headers.length} columns
                </span>
              </div>
            )}
          </div>

          {error && !previewData && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {previewData && (
            <>
              {/* Action Buttons */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Row
                </button>
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Column
                </button>
                {selectedRows.length > 0 && (
                  <button
                    onClick={handleDeleteRows}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-all duration-300 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete {selectedRows.length} Row(s)
                  </button>
                )}
                {hasChanges && (
                  <span className="text-xs text-orange-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Unsaved changes
                  </span>
                )}
              </div>

              {/* Glide Data Grid */}
              <div className="border border-black/10 overflow-hidden shadow-sm bg-white">
                <DataEditor
                  getCellContent={getCellContent}
                  columns={columns}
                  rows={numRows}
                  onCellEdited={onCellEdited}
                  rowSelect="multi"
                  onRowSelectionChange={setSelectedRows}
                  rowSelection={selectedRows}
                  getCellsForSelection={true}
                  keybindings={{
                    delete: true,
                    copy: true,
                    paste: true,
                    selectAll: true,
                  }}
                  theme={{
                    accentColor: '#000000',
                    accentFg: '#ffffff',
                    accentLight: '#f5f5f5',
                    textDark: '#000000',
                    textMedium: '#666666',
                    textLight: '#999999',
                    textBubble: '#000000',
                    bgIconHeader: '#666666',
                    fgIconHeader: '#ffffff',
                    textHeader: '#000000',
                    textHeaderSelected: '#000000',
                    bgCell: '#ffffff',
                    bgCellMedium: '#fafafa',
                    bgHeader: '#f5f5f5',
                    bgHeaderHasFocus: '#e5e5e5',
                    bgHeaderHovered: '#e5e5e5',
                    bgBubble: '#ffffff',
                    bgBubbleSelected: '#f5f5f5',
                    bgSearchResult: '#fff3cd',
                    borderColor: '#e0e0e0',
                    drilldownBorder: '#000000',
                    linkColor: '#000000',
                    headerFontStyle: '600 12px',
                    baseFontStyle: '12px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    editorFontSize: '12px',
                    lineHeight: 1.5,
                  }}
                  smoothScrollX={true}
                  smoothScrollY={true}
                  overscrollX={0}
                  overscrollY={0}
                  onDelete={selectedRows.length > 0 ? handleDeleteRows : undefined}
                  width={gridWidth}
                  height={600}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
