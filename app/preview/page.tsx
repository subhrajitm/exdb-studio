'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { parseCsvBlob, parseExcelBlob, ParsedFile } from '@/lib/parseFile'
import { DataEditor, GridCell, GridColumn, Item, EditableGridCell, CompactSelection } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'

interface PreviewData {
  headers: string[]
  rows: (string | number)[][]
  fileName: string
  fileType: string
  rowCount: number
  filePath?: string // Optional file path for saving
}

// Delta types for versioning system
type DeltaOperation = 
  | { type: 'cell_update'; row: number; col: number; oldValue: string | number; newValue: string | number }
  | { type: 'row_add'; index: number; row: (string | number)[] }
  | { type: 'row_delete'; index: number; row: (string | number)[] }
  | { type: 'row_update'; index: number; changes: { col: number; oldValue: string | number; newValue: string | number }[] }
  | { type: 'column_add'; index: number; header: string; values: (string | number)[] }
  | { type: 'column_delete'; index: number; header: string; values: (string | number)[] }
  | { type: 'column_rename'; index: number; oldHeader: string; newHeader: string }
  | { type: 'column_move'; fromIndex: number; toIndex: number }
  | { type: 'headers_update'; oldHeaders: string[]; newHeaders: string[] }

interface Delta {
  timestamp: number
  operations: DeltaOperation[]
}

type DeltaHistory = Delta[]

export default function PreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [originalData, setOriginalData] = useState<PreviewData | null>(null) // Store original data for discard
  const [filePath, setFilePath] = useState<string | null>(null) // Store file path for saving
  const [deltaHistory, setDeltaHistory] = useState<DeltaHistory>([]) // Track deltas (changes only)
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1) // Current position in history
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRows, setSelectedRows] = useState<CompactSelection>(CompactSelection.empty())
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [gridWidth, setGridWidth] = useState(1200)
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({})
  const [sortConfig, setSortConfig] = useState<{ column: number; direction: 'asc' | 'desc' } | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(50)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Compute delta between two states
  const computeDelta = useCallback((oldData: PreviewData, newData: PreviewData): Delta => {
    const operations: DeltaOperation[] = []

    // Check for header changes
    if (JSON.stringify(oldData.headers) !== JSON.stringify(newData.headers)) {
      // Check if it's a rename, add, delete, or move
      const oldHeaders = [...oldData.headers]
      const newHeaders = [...newData.headers]

      // Check for column renames
      for (let i = 0; i < Math.min(oldHeaders.length, newHeaders.length); i++) {
        if (oldHeaders[i] !== newHeaders[i]) {
          // Check if it's a rename or a move
          const newIndex = newHeaders.indexOf(oldHeaders[i])
          if (newIndex === -1) {
            // Column was renamed
            operations.push({
              type: 'column_rename',
              index: i,
              oldHeader: oldHeaders[i],
              newHeader: newHeaders[i],
            })
          }
        }
      }

      // Check for column additions/deletions
      if (newHeaders.length > oldHeaders.length) {
        // Column added
        for (let i = 0; i < newHeaders.length; i++) {
          if (!oldHeaders.includes(newHeaders[i])) {
            const values = newData.rows.map(row => row[i] || '')
            operations.push({
              type: 'column_add',
              index: i,
              header: newHeaders[i],
              values,
            })
          }
        }
      } else if (newHeaders.length < oldHeaders.length) {
        // Column deleted
        for (let i = 0; i < oldHeaders.length; i++) {
          if (!newHeaders.includes(oldHeaders[i])) {
            const values = oldData.rows.map(row => row[i] || '')
            operations.push({
              type: 'column_delete',
              index: i,
              header: oldHeaders[i],
              values,
            })
          }
        }
      }

      // Check for column moves
      const movedColumns: { from: number; to: number }[] = []
      for (let i = 0; i < Math.min(oldHeaders.length, newHeaders.length); i++) {
        if (oldHeaders[i] !== newHeaders[i]) {
          const newIndex = newHeaders.indexOf(oldHeaders[i])
          if (newIndex !== -1 && newIndex !== i) {
            movedColumns.push({ from: i, to: newIndex })
          }
        }
      }
      // Record moves (only unique ones)
      movedColumns.forEach(({ from, to }) => {
        if (!operations.some(op => op.type === 'column_move' && op.fromIndex === from && op.toIndex === to)) {
          operations.push({
            type: 'column_move',
            fromIndex: from,
            toIndex: to,
          })
        }
      })
    }

    // Check for row changes
    if (newData.rows.length > oldData.rows.length) {
      // Rows added
      for (let i = oldData.rows.length; i < newData.rows.length; i++) {
        operations.push({
          type: 'row_add',
          index: i,
          row: newData.rows[i],
        })
      }
    } else if (newData.rows.length < oldData.rows.length) {
      // Rows deleted - find which ones
      const deletedIndices: number[] = []
      for (let i = 0; i < oldData.rows.length; i++) {
        const oldRow = oldData.rows[i]
        const exists = newData.rows.some(newRow => JSON.stringify(newRow) === JSON.stringify(oldRow))
        if (!exists) {
          deletedIndices.push(i)
        }
      }
      // Delete from end to preserve indices
      deletedIndices.sort((a, b) => b - a).forEach(index => {
        operations.push({
          type: 'row_delete',
          index,
          row: oldData.rows[index],
        })
      })
    }

    // Check for cell updates (only in existing rows)
    const minRows = Math.min(oldData.rows.length, newData.rows.length)
    const minCols = Math.min(
      oldData.headers.length,
      newData.headers.length,
      ...oldData.rows.map(r => r.length),
      ...newData.rows.map(r => r.length)
    )

    for (let row = 0; row < minRows; row++) {
      const cellChanges: { col: number; oldValue: string | number; newValue: string | number }[] = []
      for (let col = 0; col < minCols; col++) {
        const oldValue = oldData.rows[row]?.[col]
        const newValue = newData.rows[row]?.[col]
        if (oldValue !== newValue && (oldValue !== undefined || newValue !== undefined)) {
          cellChanges.push({
            col,
            oldValue: oldValue ?? '',
            newValue: newValue ?? '',
          })
        }
      }
      if (cellChanges.length > 0) {
        operations.push({
          type: 'row_update',
          index: row,
          changes: cellChanges,
        })
      }
    }

    return {
      timestamp: Date.now(),
      operations,
    }
  }, [])

  // Apply delta to reconstruct state
  const applyDelta = useCallback((baseData: PreviewData, delta: Delta): PreviewData => {
    let result: PreviewData = JSON.parse(JSON.stringify(baseData))

    // Apply operations in order
    for (const op of delta.operations) {
      switch (op.type) {
        case 'cell_update':
          if (result.rows[op.row]) {
            result.rows[op.row][op.col] = op.newValue
          }
          break

        case 'row_add':
          result.rows.splice(op.index, 0, [...op.row])
          result.rowCount = result.rows.length
          break

        case 'row_delete':
          result.rows.splice(op.index, 1)
          result.rowCount = result.rows.length
          break

        case 'row_update':
          if (result.rows[op.index]) {
            op.changes.forEach(change => {
              result.rows[op.index][change.col] = change.newValue
            })
          }
          break

        case 'column_add':
          result.headers.splice(op.index, 0, op.header)
          result.rows.forEach((row, idx) => {
            row.splice(op.index, 0, op.values[idx] || '')
          })
          break

        case 'column_delete':
          result.headers.splice(op.index, 1)
          result.rows.forEach(row => {
            row.splice(op.index, 1)
          })
          break

        case 'column_rename':
          if (result.headers[op.index] === op.oldHeader) {
            result.headers[op.index] = op.newHeader
          }
          break

        case 'column_move':
          // Move header
          const [movedHeader] = result.headers.splice(op.fromIndex, 1)
          result.headers.splice(op.toIndex, 0, movedHeader)
          // Move column data
          result.rows.forEach(row => {
            const [movedCell] = row.splice(op.fromIndex, 1)
            row.splice(op.toIndex, 0, movedCell)
          })
          break

        case 'headers_update':
          result.headers = [...op.newHeaders]
          break
      }
    }

    return result
  }, [])

  // Apply inverse delta for undo
  const applyInverseDelta = useCallback((baseData: PreviewData, delta: Delta): PreviewData => {
    let result: PreviewData = JSON.parse(JSON.stringify(baseData))

    // Apply operations in reverse order with inverse operations
    for (let i = delta.operations.length - 1; i >= 0; i--) {
      const op = delta.operations[i]
      switch (op.type) {
        case 'cell_update':
          if (result.rows[op.row]) {
            result.rows[op.row][op.col] = op.oldValue
          }
          break

        case 'row_add':
          result.rows.splice(op.index, 1)
          result.rowCount = result.rows.length
          break

        case 'row_delete':
          result.rows.splice(op.index, 0, [...op.row])
          result.rowCount = result.rows.length
          break

        case 'row_update':
          if (result.rows[op.index]) {
            op.changes.forEach(change => {
              result.rows[op.index][change.col] = change.oldValue
            })
          }
          break

        case 'column_add':
          result.headers.splice(op.index, 1)
          result.rows.forEach(row => {
            row.splice(op.index, 1)
          })
          break

        case 'column_delete':
          result.headers.splice(op.index, 0, op.header)
          result.rows.forEach((row, idx) => {
            row.splice(op.index, 0, op.values[idx] || '')
          })
          break

        case 'column_rename':
          if (result.headers[op.index] === op.newHeader) {
            result.headers[op.index] = op.oldHeader
          }
          break

        case 'column_move':
          // Move header back
          const [movedHeader] = result.headers.splice(op.toIndex, 1)
          result.headers.splice(op.fromIndex, 0, movedHeader)
          // Move column data back
          result.rows.forEach(row => {
            const [movedCell] = row.splice(op.toIndex, 1)
            row.splice(op.fromIndex, 0, movedCell)
          })
          break

        case 'headers_update':
          result.headers = [...op.oldHeaders]
          break
      }
    }

    return result
  }, [])

  // Reconstruct current state from original + deltas
  const reconstructState = useCallback((baseData: PreviewData, deltas: DeltaHistory, upToIndex: number): PreviewData => {
    let state = JSON.parse(JSON.stringify(baseData))
    for (let i = 0; i <= upToIndex && i < deltas.length; i++) {
      state = applyDelta(state, deltas[i])
    }
    return state
  }, [applyDelta])

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
    if (loading) {
      return // Wait for auth to finish loading
    }

    if (!user) {
      router.push('/login')
      return
    }

    if (previewData) {
      setIsLoading(false)
      setError(null)
      return
    }

    const filePathParam = searchParams.get('path')
    const fileName = searchParams.get('name') || 'file'
    const fileType = searchParams.get('type') || ''

    if (filePathParam) {
      setFilePath(filePathParam) // Store file path for saving
      loadAndParseFile(filePathParam, fileName, fileType)
    } else {
      // Try to load from sessionStorage (fallback for files uploaded before this change)
      const storedData = sessionStorage.getItem('previewData')
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData)
          
          // Extract and store file path if available
          if (parsed.filePath) {
            setFilePath(parsed.filePath)
          }
          
          setPreviewData(parsed)
          const deepCopy = JSON.parse(JSON.stringify(parsed))
          setOriginalData(deepCopy) // Deep copy for discard
          setDeltaHistory([]) // Initialize empty delta history
          setCurrentHistoryIndex(-1) // No deltas yet
          setError(null)
          setIsLoading(false)
          // Clear sessionStorage after loading to prevent stale data
          sessionStorage.removeItem('previewData')
        } catch (err) {
          console.error('Failed to parse preview data:', err)
          setError('Failed to load preview data. Please try uploading the file again.')
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
        setError('No file data found. Please select a file from the dashboard or upload a new file.')
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
      let parsed: ParsedFile

      if (extension === 'csv') {
        parsed = await parseCsvBlob(data)
      } else if (extension === 'xlsx' || extension === 'xls') {
        parsed = await parseExcelBlob(data)
      } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel files.')
      }

      const parsedData: PreviewData = {
        headers: parsed.headers,
        rows: parsed.rows,
        fileName,
        fileType,
        rowCount: parsed.rows.length,
      }

      const deepCopy = JSON.parse(JSON.stringify(parsedData))
      setPreviewData(parsedData)
      setOriginalData(deepCopy) // Deep copy for discard
      setDeltaHistory([]) // Initialize empty delta history
      setCurrentHistoryIndex(-1) // No deltas yet
      setIsLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load file')
      setIsLoading(false)
    }
  }

  // Save delta to change history
  const saveToHistory = useCallback((oldData: PreviewData, newData: PreviewData) => {
    if (!originalData) return
    
    // Compute delta from old to new state
    const delta = computeDelta(oldData, newData)
    
    // Only save if there are actual changes
    if (delta.operations.length === 0) return
    
    // Update both states atomically
    setCurrentHistoryIndex((prevIndex) => {
      setDeltaHistory((prevHistory) => {
        // If we're not at the end of history, remove all entries after current index
        const newHistory = prevHistory.slice(0, prevIndex + 1)
        newHistory.push(delta)
        
        // Limit history to last 50 deltas to prevent memory issues
        const limitedHistory = newHistory.length > 50 
          ? newHistory.slice(-50) 
          : newHistory
        
        // Calculate new index based on limited history length
        const calculatedIndex = limitedHistory.length - 1
        // Update index to point to the new entry (last in limited history)
        // Limit to 49 (since we have max 50 entries, index 0-49)
        setCurrentHistoryIndex(Math.min(calculatedIndex, 49))
        
        return limitedHistory
      })
      
      // Return current index - it will be updated in setDeltaHistory callback
      return prevIndex
    })
  }, [computeDelta, originalData])

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

    // Return cell configuration
    // Glide Data Grid's default behavior:
    // - Single click: selects cell (when readonly: true or false)
    // - Double click: opens editor (when readonly: false and allowOverlay: true)
    // - Enter/F2: opens editor (when readonly: false)
    return {
      kind: 'text',
      data: displayValue,
      displayData: displayValue,
      allowOverlay: true,
      readonly: false, // Allow editing - double-click will open editor naturally
    }
  }, [getDisplayData])

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

      const updatedData = {
        ...previewData,
        rows: newRows,
      }
      
      // Save to history before updating
      saveToHistory(previewData, updatedData)
      
      setPreviewData(updatedData)
      setHasChanges(true)
    }
  }, [previewData, getDisplayData, getAllFilteredData, searchQuery, sortConfig, currentPage, rowsPerPage, saveToHistory])


  // Handle adding new row
  const handleAddRow = () => {
    if (!previewData) return

    const newRow = new Array(previewData.headers.length).fill('')
    const newRows = [...previewData.rows, newRow]

    const updatedData = {
      ...previewData,
      rows: newRows,
      rowCount: newRows.length,
    }
    
    // Save to history before updating
    saveToHistory(previewData, updatedData)
    
    setPreviewData(updatedData)
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

      const updatedData = {
        ...previewData,
        rows: newRows,
        rowCount: newRows.length,
      }
      
      // Save to history before updating
      saveToHistory(previewData, updatedData)
      
      setPreviewData(updatedData)
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

    const updatedData = {
      ...previewData,
      headers: newHeaders,
      rows: newRows,
    }
    
    // Save to history before updating
    saveToHistory(previewData, updatedData)
    
    setPreviewData(updatedData)
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

      const updatedData = {
        ...previewData,
        headers: newHeaders,
        rows: newRows,
      }
      
      // Save to history before updating
      saveToHistory(previewData, updatedData)
      
      setPreviewData(updatedData)
      setSelectedColumn(null)
      setHasChanges(true)
    }
  }

  // Handle renaming column
  const handleRenameColumn = (colIndex: number, newName: string) => {
    if (!previewData || colIndex < 0 || colIndex >= previewData.headers.length) return

    const newHeaders = [...previewData.headers]
    newHeaders[colIndex] = newName.trim() || `Column ${colIndex + 1}`

    const updatedData = {
      ...previewData,
      headers: newHeaders,
    }
    
    // Save to history before updating
    saveToHistory(previewData, updatedData)
    
    setPreviewData(updatedData)
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
        const deepCopy = JSON.parse(JSON.stringify(originalData))
        setPreviewData(deepCopy) // Deep copy to reset
        setDeltaHistory([]) // Reset delta history
        setCurrentHistoryIndex(-1) // Reset history index
        setHasChanges(false)
        setSelectedRows(CompactSelection.empty())
        setError(null)
        setSuccessMessage(null)
      }
    }
  }

  // Handle undo (revert to previous change)
  const handleUndo = () => {
    if (!previewData || !originalData || deltaHistory.length === 0 || currentHistoryIndex < 0) return
    
    const previousIndex = currentHistoryIndex - 1
    
    if (previousIndex < 0) {
      // Revert to original
      const deepCopy = JSON.parse(JSON.stringify(originalData))
      setPreviewData(deepCopy)
      setCurrentHistoryIndex(-1)
      setHasChanges(false)
    } else {
      // Reconstruct state up to previous index
      const previousState = reconstructState(originalData, deltaHistory, previousIndex)
      setPreviewData(previousState)
      setCurrentHistoryIndex(previousIndex)
      setHasChanges(true)
    }
  }

  // Handle revert to original
  const handleRevertToOriginal = () => {
    if (!originalData) return
    
    if (confirm('Are you sure you want to revert all changes back to the original file? This action cannot be undone.')) {
      const deepCopy = JSON.parse(JSON.stringify(originalData))
      setPreviewData(deepCopy)
      setDeltaHistory([]) // Reset delta history
      setCurrentHistoryIndex(-1) // Reset history index
      setHasChanges(false)
      setSelectedRows(CompactSelection.empty())
      setError(null)
      setSuccessMessage(null)
    }
  }

  // Handle save changes - upload back to Supabase Storage
  const handleSaveChanges = async () => {
    if (!previewData || !filePath) {
      setError('Cannot save: File path not available. Please reload the page.')
      return
    }

    if (!user) {
      setError('Cannot save: User not authenticated.')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const extension = previewData.fileName.split('.').pop()?.toLowerCase()
      let blob: Blob
      let mimeType: string

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
      }

      // Upload to Supabase Storage, replacing the existing file
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true, // Replace existing file
          contentType: mimeType,
        })

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`)
      }

      // Update original data to match saved data
      const deepCopy = JSON.parse(JSON.stringify(previewData))
      setOriginalData(deepCopy)
      setDeltaHistory([]) // Reset delta history
      setCurrentHistoryIndex(-1) // Reset history index
      setHasChanges(false)
      setSuccessMessage('File saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
      console.error(err)
    } finally {
      setIsSaving(false)
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
                {/* Undo button */}
                {deltaHistory.length > 0 && currentHistoryIndex >= 0 && (
                  <button
                    onClick={handleUndo}
                    className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-1.5"
                    title="Undo last change"
                  >
                    <span className="material-symbols-outlined text-sm">undo</span>
                    Undo
                  </button>
                )}
                {/* Revert to original button */}
                {hasChanges && originalData && (
                  <button
                    onClick={handleRevertToOriginal}
                    className="px-3 py-1.5 text-xs font-medium text-orange-600 border border-orange-200 hover:bg-orange-50 transition-all duration-300 flex items-center gap-1.5"
                    title="Revert all changes to original file"
                  >
                    <span className="material-symbols-outlined text-sm">restore</span>
                    Revert
                  </button>
                )}
                {hasChanges && (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving || !filePath}
                      className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-sm">{isSaving ? 'hourglass_empty' : 'save'}</span>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                      className="px-4 py-2 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-green-600">check_circle</span>
              <p className="text-xs text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-600 hover:text-green-800 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

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
                    {deltaHistory.length > 0 && (
                      <span className="text-orange-500 ml-1">
                        ({currentHistoryIndex + 1} {currentHistoryIndex === 0 ? 'change' : 'changes'})
                      </span>
                    )}
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
                      
                      const updatedData = {
                        ...previewData,
                        headers: newHeaders,
                        rows: newRows,
                      }
                      
                      // Save to history before updating
                      saveToHistory(previewData, updatedData)
                      
                      setPreviewData(updatedData)
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
                      bgHeaderHasFocus: '#d0d0d0',
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
