'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [originalData, setOriginalData] = useState<PreviewData | null>(null) // Store original data for discard
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRows, setSelectedRows] = useState<CompactSelection>(CompactSelection.empty())
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [gridWidth, setGridWidth] = useState(1200)
  const [editableCell, setEditableCell] = useState<{ col: number; row: number } | null>(null)
  const [lastClickCell, setLastClickCell] = useState<{ col: number; row: number; time: number } | null>(null)
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})
  const [sortConfig, setSortConfig] = useState<{ column: number; direction: 'asc' | 'desc' } | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(50)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const updateWidth = () => {
      if (gridContainerRef.current) {
        const containerWidth = gridContainerRef.current.offsetWidth
        setGridWidth(containerWidth)
      } else {
        // Fallback: window width minus padding (16px each side = 32px total)
        setGridWidth(Math.max(800, window.innerWidth - 32))
      }
    }
    
    // Initial update
    updateWidth()
    
    // Update on window resize
    window.addEventListener('resize', updateWidth)
    
    // Update when previewData changes (component mounts)
    const timer = setTimeout(updateWidth, 100)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateWidth)
    }
  }, [previewData])

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
          setOriginalData(JSON.parse(JSON.stringify(parsed))) // Deep copy for discard
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

  // Get all filtered and sorted data for pagination calculations
  const getAllFilteredDataForPagination = useCallback((): PreviewData | null => {
    if (!previewData) return null

    let data = previewData

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filteredRows = data.rows.filter(row =>
        row.some(cell => String(cell || '').toLowerCase().includes(query))
      )
      data = { ...data, rows: filteredRows, rowCount: filteredRows.length }
    }

    // Apply sorting
    if (sortConfig) {
      const sortedRows = [...data.rows].sort((a, b) => {
        const aVal = String(a[sortConfig.column] || '')
        const bVal = String(b[sortConfig.column] || '')
        
        if (sortConfig.direction === 'asc') {
          return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
        } else {
          return bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' })
        }
      })
      data = { ...data, rows: sortedRows }
    }

    return data
  }, [previewData, searchQuery, sortConfig])

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortConfig])

  // Reset to first page if current page is out of bounds
  useEffect(() => {
    if (!previewData) return
    
    const allFilteredData = getAllFilteredDataForPagination()
    if (!allFilteredData) return
    
    const totalRows = allFilteredData.rowCount || previewData.rowCount || 0
    const totalPages = Math.ceil(totalRows / rowsPerPage)
    
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [previewData, currentPage, rowsPerPage, getAllFilteredDataForPagination])

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
             setOriginalData(JSON.parse(JSON.stringify(parsedData))) // Deep copy for discard
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
  const getColumns = useCallback((): GridColumn[] => {
    if (!previewData) return []
    
    return previewData.headers.map((header, index) => {
      const columnId = `col-${index}`
      const sortIndicator = sortConfig && sortConfig.column === index 
        ? (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')
        : ''
      
      return {
        title: (header || `Column ${index + 1}`) + sortIndicator,
        id: columnId,
        width: columnWidths[columnId] || 150,
        hasMenu: true,
      }
    })
  }, [previewData, columnWidths, sortConfig])

  // Get all filtered and sorted data (before pagination)
  const getAllFilteredData = useCallback((): PreviewData | null => {
    if (!previewData) return null

    let data = previewData

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filteredRows = data.rows.filter(row =>
        row.some(cell => String(cell || '').toLowerCase().includes(query))
      )
      data = { ...data, rows: filteredRows, rowCount: filteredRows.length }
    }

    // Apply sorting
    if (sortConfig) {
      const sortedRows = [...data.rows].sort((a, b) => {
        const aVal = String(a[sortConfig.column] || '')
        const bVal = String(b[sortConfig.column] || '')
        
        if (sortConfig.direction === 'asc') {
          return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
        } else {
          return bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' })
        }
      })
      data = { ...data, rows: sortedRows }
    }

    return data
  }, [previewData, searchQuery, sortConfig])

  // Get display data (filtered, sorted, and paginated)
  const getDisplayData = useCallback((): PreviewData | null => {
    const allData = getAllFilteredData()
    if (!allData) return null

    // Apply pagination
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const paginatedRows = allData.rows.slice(startIndex, endIndex)

    return {
      ...allData,
      rows: paginatedRows,
      rowCount: paginatedRows.length, // Display count (not total)
    }
  }, [getAllFilteredData, currentPage, rowsPerPage])

  // Get cell content for Glide Data Grid
  const getCellContent = useCallback((cell: Item): GridCell => {
    const [col, row] = cell

    const displayData = getDisplayData()

    if (!displayData) {
      return {
        kind: 'text',
        data: '',
        displayData: '',
        allowOverlay: true,
      }
    }

    // Data cells (Glide Data Grid handles headers automatically via columns)
    const cellValue = displayData.rows[row]?.[col]
    const displayValue = cellValue !== undefined && cellValue !== null ? String(cellValue) : ''

    // Check if this cell is editable (was double-clicked)
    const isEditable = editableCell !== null && editableCell.col === col && editableCell.row === row

    // Return cell configuration
    // Note: readonly: false allows editing on double-click or Enter/F2
    return {
      kind: 'text',
      data: displayValue,
      displayData: displayValue,
      allowOverlay: true,
      readonly: !isEditable, // Only allow editing if double-clicked
    }
  }, [getDisplayData, editableCell])

  // Handle cell editing
  const onCellEdited = useCallback((cell: Item, newValue: EditableGridCell): void => {
    if (!previewData) return

    const [col, row] = cell

    // Editing data cell
    if (row >= 0 && newValue.kind === 'text') {
      const displayData = getDisplayData()
      const allFilteredData = getAllFilteredData()
      if (!displayData || !allFilteredData) return

      // Map paginated row index to filtered/sorted row index
      const paginatedRowIndex = row
      const filteredRowIndex = (currentPage - 1) * rowsPerPage + paginatedRowIndex
      
      // Get the actual row data from filtered data
      const filteredRow = allFilteredData.rows[filteredRowIndex]
      if (!filteredRow) return

      // Map filtered/sorted row index back to original row index
      const originalRowIndex = previewData.rows.findIndex((origRow, origIdx) => {
        // If search/filter/sort is active, match by content
        if (searchQuery.trim() || sortConfig) {
          return JSON.stringify(origRow) === JSON.stringify(filteredRow)
        }
        return origIdx === filteredRowIndex
      })

      const actualRowIndex = originalRowIndex >= 0 ? originalRowIndex : filteredRowIndex
      
      const newRows = [...previewData.rows]
      if (!newRows[actualRowIndex]) {
        newRows[actualRowIndex] = new Array(previewData.headers.length).fill('')
      }
      newRows[actualRowIndex][col] = newValue.data

      setPreviewData({
        ...previewData,
        rows: newRows,
      })
      setHasChanges(true)
      
      // Make cell readonly again after editing
      setEditableCell(null)
    }
  }, [previewData, getDisplayData, getAllFilteredData, searchQuery, sortConfig, currentPage, rowsPerPage])

  // Handle cell click for double-click detection
  const handleCellClick = useCallback((cell: Item, event: any) => {
    const [col, row] = cell
    
    // Skip if clicking on header rows (negative row indices)
    if (row < 0) return
    
    // Check if this is a double-click using event detail
    if (event && (event.detail === 2 || (event as MouseEvent).detail === 2)) {
      // Double-click detected - make cell editable immediately
      setEditableCell({ col, row })
      setLastClickCell(null)
      // Don't prevent default - let Glide Data Grid handle the edit
      return
    }
    
    const currentTime = Date.now()
    
    // Fallback: Check if this is a double-click (same cell clicked within 500ms)
    if (
      lastClickCell &&
      lastClickCell.col === col &&
      lastClickCell.row === row &&
      currentTime - lastClickCell.time < 500
    ) {
      // Double-click detected - make cell editable
      setEditableCell({ col, row })
      setLastClickCell(null)
    } else {
      // Store click info for double-click detection
      setLastClickCell({ col, row, time: currentTime })
      // Clear other editable cells on single click
      if (editableCell && (editableCell.col !== col || editableCell.row !== row)) {
        setEditableCell(null)
      }
    }
  }, [lastClickCell, editableCell])

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
      const displayData = getDisplayData()
      const allFilteredData = getAllFilteredData()
      if (!displayData || !allFilteredData) return

      // Map paginated row indices to filtered row indices, then to original row indices
      const indicesToDelete = Array.from(selectedRows)
        .filter(idx => idx >= 0 && idx < displayData.rows.length)
        .map(paginatedIdx => {
          // Convert paginated index to filtered index
          const filteredIdx = (currentPage - 1) * rowsPerPage + paginatedIdx
          const displayRow = allFilteredData.rows[filteredIdx]
          
          if (!displayRow) return -1
          
          // Find original index
          return previewData.rows.findIndex((origRow, origIdx) => {
            if (searchQuery.trim() || sortConfig) {
              return JSON.stringify(origRow) === JSON.stringify(displayRow)
            }
            return origIdx === filteredIdx
          })
        })
        .filter(idx => idx >= 0)
        .sort((a, b) => b - a) // Sort descending to delete from end first

      const newRows = previewData.rows.filter((_, idx) => !indicesToDelete.includes(idx))

      setPreviewData({
        ...previewData,
        rows: newRows,
        rowCount: newRows.length,
      })
      setSelectedRows(CompactSelection.empty())
      setHasChanges(true)
      
      // Adjust current page if needed after deletion
      const newTotalRows = newRows.length
      const newTotalPages = Math.ceil(newTotalRows / rowsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }
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
  const handleDeleteColumn = (colIndex: number | null) => {
    if (!previewData || colIndex === null) return

    if (previewData.headers.length <= 1) {
      alert('Cannot delete the last column')
      return
    }

    if (confirm(`Are you sure you want to delete column "${previewData.headers[colIndex]}"? All data in this column will be lost.`)) {
      const newHeaders = previewData.headers.filter((_, idx) => idx !== colIndex)
      const newRows = previewData.rows.map((row) => row.filter((_, idx) => idx !== colIndex))

      setPreviewData({
        ...previewData,
        headers: newHeaders,
        rows: newRows,
      })
      setSelectedColumn(null)
      setHasChanges(true)
    }
  }

  // Handle renaming column
  const handleRenameColumn = (colIndex: number, newName: string) => {
    if (!previewData || colIndex < 0 || colIndex >= previewData.headers.length) return

    const newHeaders = [...previewData.headers]
    newHeaders[colIndex] = newName.trim() || `Column ${colIndex + 1}`

    setPreviewData({
      ...previewData,
      headers: newHeaders,
    })
    setHasChanges(true)
  }

  // Handle column sorting
  const handleSortColumn = (colIndex: number) => {
    if (!previewData || colIndex < 0 || colIndex >= previewData.headers.length) return

    if (sortConfig && sortConfig.column === colIndex) {
      // Toggle direction or clear sort
      if (sortConfig.direction === 'asc') {
        setSortConfig({ column: colIndex, direction: 'desc' })
      } else {
        setSortConfig(null)
      }
    } else {
      // New sort
      setSortConfig({ column: colIndex, direction: 'asc' })
    }
  }

  // Handle column header menu click
  const handleColumnHeaderMenuClick = (colIndex: number, action: string) => {
    if (!previewData || colIndex < 0 || colIndex >= previewData.headers.length) return

    switch (action) {
      case 'sort-asc':
        setSortConfig({ column: colIndex, direction: 'asc' })
        break
      case 'sort-desc':
        setSortConfig({ column: colIndex, direction: 'desc' })
        break
      case 'clear-sort':
        setSortConfig(null)
        break
      case 'rename':
        const newName = prompt(`Rename column "${previewData.headers[colIndex]}":`, previewData.headers[colIndex])
        if (newName !== null && newName.trim() !== previewData.headers[colIndex]) {
          handleRenameColumn(colIndex, newName)
        }
        break
      case 'delete':
        handleDeleteColumn(colIndex)
        break
      case 'select':
        setSelectedColumn(colIndex)
        break
      default:
        break
    }
  }

  // Handle discard changes
  const handleDiscardChanges = () => {
    if (!originalData) return
    
    if (hasChanges) {
      if (confirm('Are you sure you want to discard all unsaved changes? This action cannot be undone.')) {
        setPreviewData(JSON.parse(JSON.stringify(originalData))) // Deep copy to reset
        setHasChanges(false)
        setSelectedRows(CompactSelection.empty())
        setError(null)
      }
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
             // Update original data to match saved data
             setOriginalData(JSON.parse(JSON.stringify(previewData)))
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
  const displayData = getDisplayData()
  const allFilteredData = getAllFilteredData()
  const numRows = displayData?.rowCount || 0
  const totalRows = allFilteredData?.rowCount || previewData?.rowCount || 0
  const totalPages = Math.ceil(totalRows / rowsPerPage)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-6 px-4">
        <div className="w-full mx-auto max-w-full overflow-hidden">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-light text-black tracking-tight">
                Data Preview
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
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
                {hasChanges && (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      Save Changes
                    </button>
                    <button
                      onClick={handleDiscardChanges}
                      className="px-4 py-2 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Discard Changes
                    </button>
                  </>
                )}
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
              {/* Search and Filter */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 border border-black/10 px-2 py-1 flex-1 max-w-md">
                  <span className="material-symbols-outlined text-sm text-black/60">search</span>
                  <input
                    type="text"
                    placeholder="Search in table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-xs border-none outline-none bg-transparent text-black"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-black/40 hover:text-black/60 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
                {sortConfig && (
                  <button
                    onClick={() => setSortConfig(null)}
                    className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">clear_all</span>
                    Clear Sort
                  </button>
                )}
                {searchQuery && displayData && (
                  <span className="text-xs text-black/60">
                    Found {displayData.rowCount} of {previewData.rowCount} rows
                  </span>
                )}
              </div>

              {/* Action Buttons - CRUD Operations */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                {selectedRows.length > 0 && (
                  <button
                    onClick={handleDeleteRows}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-all duration-300 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete {selectedRows.length} Row(s)
                  </button>
                )}
                {previewData && (
                  <div className="flex items-center gap-2 border border-black/10 px-2 py-1">
                    <span className="text-xs text-black/60">Column:</span>
                    <select
                      value={selectedColumn !== null ? selectedColumn : ''}
                      onChange={(e) => setSelectedColumn(e.target.value ? parseInt(e.target.value) : null)}
                      className="text-xs border border-black/20 px-2 py-1 bg-white focus:outline-none focus:border-black/40"
                    >
                      <option value="">-- Select --</option>
                      {previewData.headers.map((header, index) => (
                        <option key={index} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedColumn !== null && previewData && (
                  <>
                    <button
                      onClick={() => handleSortColumn(selectedColumn)}
                      className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                      title={sortConfig && sortConfig.column === selectedColumn 
                        ? (sortConfig.direction === 'asc' ? 'Sort Descending' : 'Clear Sort')
                        : 'Sort Ascending'}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {sortConfig && sortConfig.column === selectedColumn
                          ? (sortConfig.direction === 'asc' ? 'arrow_downward' : 'clear')
                          : 'arrow_upward'}
                      </span>
                      {sortConfig && sortConfig.column === selectedColumn
                        ? (sortConfig.direction === 'asc' ? 'Sort ↓' : 'Clear Sort')
                        : 'Sort ↑'}
                    </button>
                    <button
                      onClick={() => {
                        const newName = prompt(`Rename column "${previewData.headers[selectedColumn]}":`, previewData.headers[selectedColumn])
                        if (newName !== null && newName.trim() !== previewData.headers[selectedColumn]) {
                          handleRenameColumn(selectedColumn, newName)
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(selectedColumn)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-all duration-300 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Delete Column
                    </button>
                    <button
                      onClick={() => setSelectedColumn(null)}
                      className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Cancel
                    </button>
                  </>
                )}
                {hasChanges && (
                  <span className="text-xs text-orange-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Unsaved changes
                  </span>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/60">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value))
                      setCurrentPage(1) // Reset to first page
                    }}
                    className="text-xs border border-black/20 px-2 py-1 bg-white focus:outline-none focus:border-black/40"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/60">
                    Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} rows
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First page"
                  >
                    <span className="material-symbols-outlined text-sm">first_page</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-black/60">Page</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1))
                        setCurrentPage(page)
                      }}
                      className="w-12 text-xs border border-black/20 px-2 py-1 bg-white focus:outline-none focus:border-black/40 text-center"
                    />
                    <span className="text-xs text-black/60">of {totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2 py-1 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2 py-1 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last page"
                  >
                    <span className="material-symbols-outlined text-sm">last_page</span>
                  </button>
                </div>
              </div>

              {/* Glide Data Grid */}
              <div ref={gridContainerRef} className="w-full">
                <div className="border border-black/10 overflow-hidden shadow-sm bg-white">
                  <DataEditor
                    getCellContent={getCellContent}
                    columns={columns}
                    rows={numRows}
                    onCellEdited={onCellEdited}
                    onCellClicked={handleCellClick}
                    onCellActivated={handleCellClick}
                    rowSelect="multi"
                    onRowSelectionChange={setSelectedRows}
                    rowSelection={selectedRows}
                    getCellsForSelection={true}
                    onColumnMoved={(startIndex, endIndex) => {
                      if (!previewData) return
                      
                      const newHeaders = [...previewData.headers]
                      const [movedHeader] = newHeaders.splice(startIndex, 1)
                      newHeaders.splice(endIndex, 0, movedHeader)
                      
                      const newRows = previewData.rows.map(row => {
                        const newRow = [...row]
                        const [movedCell] = newRow.splice(startIndex, 1)
                        newRow.splice(endIndex, 0, movedCell)
                        return newRow
                      })
                      
                      setPreviewData({
                        ...previewData,
                        headers: newHeaders,
                        rows: newRows,
                      })
                      setHasChanges(true)
                    }}
                    onColumnResize={(column, newSize) => {
                      // Persist column width
                      if (column && newSize > 0) {
                        setColumnWidths(prev => ({
                          ...prev,
                          [column.id]: newSize,
                        }))
                      }
                    }}
                    onColumnHeaderClick={(colIndex, event) => {
                      // Double-click header to sort
                      if (event && event.detail === 2) {
                        handleSortColumn(colIndex)
                      }
                    }}
                    keybindings={{
                      delete: true,
                      copy: true,
                      paste: true,
                      selectAll: true,
                      edit: true,
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
                      textHeaderSelected: '#ffffff',
                      bgCell: '#ffffff',
                      bgCellMedium: '#fafafa',
                      bgHeader: '#f5f5f5',
                      bgHeaderHasFocus: '#000000',
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
