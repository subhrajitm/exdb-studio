import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedFile {
  headers: string[]
  rows: (string | number)[][]
}

/**
 * Parse a CSV string or Blob into headers + rows.
 */
export function parseCsvContent(content: string): ParsedFile {
  let parsedRows: (string | number)[][] = []

  Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
      parsedRows = results.data as (string | number)[][]
    },
  })

  if (parsedRows.length === 0) {
    throw new Error('CSV file is empty')
  }

  const headers = parsedRows[0] as string[]
  const dataRows = parsedRows.slice(1)

  return { headers, rows: dataRows }
}

export async function parseCsvBlob(file: Blob): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = parseCsvContent(text)
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read CSV file'))
    reader.readAsText(file)
  })
}

export function parseExcelArrayBuffer(buffer: ArrayBuffer | string): ParsedFile {
  const workbook = XLSX.read(buffer, { type: typeof buffer === 'string' ? 'binary' : 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty')
  }

  const headers = (jsonData[0] as any[]).map((h) => String(h || ''))
  const rows = jsonData.slice(1) as (string | number)[][]

  return { headers, rows }
}

export async function parseExcelBlob(file: Blob): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Failed to read Excel file'))
          return
        }
        const parsed = parseExcelArrayBuffer(data)
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read Excel file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * High-level helper: parse a File (csv/xlsx/xls) into headers + rows.
 */
export async function parseFileByExtension(file: File): Promise<ParsedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    return parseCsvBlob(file)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelBlob(file)
  }

  throw new Error('Unsupported file type. Please upload CSV or Excel files.')
}




