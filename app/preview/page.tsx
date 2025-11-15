'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editingHeader, setEditingHeader] = useState<number | null>(null)
  const [cellValue, setCellValue] = useState<string>('')
  const [headerValue, setHeaderValue] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const rowsPerPage = 10
  const supabase = createClient()
  const cellInputRef = useRef<HTMLInputElement>(null)
  const headerInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus()
      cellInputRef.current.select()
    }
  }, [editingCell])

  useEffect(() => {
    if (editingHeader !== null && headerInputRef.current) {
      headerInputRef.current.focus()
      headerInputRef.current.select()
    }
  }, [editingHeader])

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

  // CRUD Operations

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (!previewData) return
    const actualRowIndex = startIndex + rowIndex
    setCellValue(String(previewData.rows[actualRowIndex]?.[colIndex] ?? ''))
    setEditingCell({ row: actualRowIndex, col: colIndex })
  }

  const handleCellSave = () => {
    if (!previewData || !editingCell) return

    const newRows = [...previewData.rows]
    if (!newRows[editingCell.row]) {
      newRows[editingCell.row] = new Array(previewData.headers.length).fill('')
    }
    newRows[editingCell.row][editingCell.col] = cellValue

    setPreviewData({
      ...previewData,
      rows: newRows,
      rowCount: newRows.length,
    })
    setEditingCell(null)
    setCellValue('')
    setHasChanges(true)
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setCellValue('')
  }

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave()
    } else if (e.key === 'Escape') {
      handleCellCancel()
    }
  }

  const handleHeaderClick = (colIndex: number) => {
    if (!previewData) return
    setHeaderValue(previewData.headers[colIndex] || '')
    setEditingHeader(colIndex)
  }

  const handleHeaderSave = () => {
    if (!previewData || editingHeader === null) return

    const newHeaders = [...previewData.headers]
    newHeaders[editingHeader] = headerValue || `Column ${editingHeader + 1}`

    setPreviewData({
      ...previewData,
      headers: newHeaders,
    })
    setEditingHeader(null)
    setHeaderValue('')
    setHasChanges(true)
  }

  const handleHeaderCancel = () => {
    setEditingHeader(null)
    setHeaderValue('')
  }

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHeaderSave()
    } else if (e.key === 'Escape') {
      handleHeaderCancel()
    }
  }

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

  const handleDeleteRow = (rowIndex: number) => {
    if (!previewData) return

    if (confirm('Are you sure you want to delete this row?')) {
      const actualRowIndex = startIndex + rowIndex
      const newRows = previewData.rows.filter((_, idx) => idx !== actualRowIndex)

      setPreviewData({
        ...previewData,
        rows: newRows,
        rowCount: newRows.length,
      })
      setHasChanges(true)

      // Adjust page if needed
      if (newRows.length > 0 && currentPage > Math.ceil(newRows.length / rowsPerPage)) {
        setCurrentPage(Math.ceil(newRows.length / rowsPerPage))
      }
    }
  }

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
      setEditingCell(null)
    }
  }

  const handleSaveChanges = () => {
    if (!previewData) return

    try {
      const extension = previewData.fileName.split('.').pop()?.toLowerCase()
      let blob: Blob
      let mimeType: string
      let filename: string

      if (extension === 'csv') {
        // Convert to CSV
        const csvRows = [
          previewData.headers.join(','),
          ...previewData.rows.map((row) =>
            row.map((cell) => {
              const cellStr = String(cell ?? '')
              // Escape commas and quotes
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
        // Convert to Excel
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
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = previewData.fileName.replace(/\.[^/.]+$/, '_edited.xlsx')
      }

      // Download the file
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

  const totalPages = previewData ? Math.ceil(previewData.rowCount / rowsPerPage) : 1
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const currentRows = previewData?.rows.slice(startIndex, endIndex) || []

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

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-6 px-4">
        <div className="max-w-7xl mx-auto">
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
                    className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 rounded-lg flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    Save Changes
                  </button>
                )}
                <button
                  onClick={() => router.push('/upload')}
                  className="px-4 py-2 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 rounded-lg"
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
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {previewData && (
            <>
              {/* Action Buttons */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAddRow}
                  className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 rounded-lg flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Row
                </button>
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 rounded-lg flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Column
                </button>
                {hasChanges && (
                  <span className="text-xs text-orange-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Unsaved changes
                  </span>
                )}
              </div>

              {/* Table Container */}
              <div className="bg-white border border-black/10 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-black/5 border-b border-black/10">
                      <tr>
                        <th className="px-2 py-2 text-center font-medium text-black/80 w-12">
                          Actions
                        </th>
                        {previewData.headers.map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left font-medium text-black/80 whitespace-nowrap relative group"
                          >
                            {editingHeader === index ? (
                              <input
                                ref={headerInputRef}
                                type="text"
                                value={headerValue}
                                onChange={(e) => setHeaderValue(e.target.value)}
                                onBlur={handleHeaderSave}
                                onKeyDown={handleHeaderKeyDown}
                                className="w-full px-2 py-1 border border-black/30 rounded bg-white focus:outline-none focus:border-black/60"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => handleHeaderClick(index)}
                                  className="cursor-pointer hover:text-black flex-1"
                                  title="Click to edit"
                                >
                                  {header || `Column ${index + 1}`}
                                </span>
                                <button
                                  onClick={() => handleDeleteColumn(index)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                  title="Delete column"
                                >
                                  <span className="material-symbols-outlined text-sm text-red-600">
                                    delete
                                  </span>
                                </button>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {currentRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={previewData.headers.length + 1}
                            className="px-4 py-8 text-center text-black/50"
                          >
                            No data to display. Click "Add Row" to add data.
                          </td>
                        </tr>
                      ) : (
                        currentRows.map((row, rowIndex) => {
                          const actualRowIndex = startIndex + rowIndex
                          const isEditing =
                            editingCell?.row === actualRowIndex
                          return (
                            <tr
                              key={actualRowIndex}
                              className="hover:bg-black/5 transition-colors"
                            >
                              <td className="px-2 py-2 text-center">
                                <button
                                  onClick={() => handleDeleteRow(rowIndex)}
                                  className="p-1 hover:bg-red-100 rounded transition-colors"
                                  title="Delete row"
                                >
                                  <span className="material-symbols-outlined text-sm text-red-600">
                                    delete
                                  </span>
                                </button>
                              </td>
                              {previewData.headers.map((_, colIndex) => {
                                const isCellEditing =
                                  isEditing &&
                                  editingCell?.col === colIndex
                                return (
                                  <td
                                    key={colIndex}
                                    className="px-4 py-2 text-black/70 whitespace-nowrap"
                                  >
                                    {isCellEditing ? (
                                      <input
                                        ref={cellInputRef}
                                        type="text"
                                        value={cellValue}
                                        onChange={(e) =>
                                          setCellValue(e.target.value)
                                        }
                                        onBlur={handleCellSave}
                                        onKeyDown={handleCellKeyDown}
                                        className="w-full px-2 py-1 border border-black/30 rounded bg-white focus:outline-none focus:border-black/60"
                                      />
                                    ) : (
                                      <span
                                        onClick={() =>
                                          handleCellClick(rowIndex, colIndex)
                                        }
                                        className="cursor-pointer hover:bg-black/10 px-2 py-1 rounded block"
                                        title="Click to edit"
                                      >
                                        {row[colIndex] !== undefined &&
                                        row[colIndex] !== null
                                          ? String(row[colIndex])
                                          : ''}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-black/60">
                    Showing {startIndex + 1} to{' '}
                    {Math.min(endIndex, previewData.rowCount)} of{' '}
                    {previewData.rowCount.toLocaleString()} rows
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-black/60">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
