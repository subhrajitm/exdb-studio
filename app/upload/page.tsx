'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

interface FileWithPreview extends File {
  preview?: string
}

export default function UploadPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return '📊'
      case 'csv':
        return '📄'
      case 'pdf':
        return '📑'
      default:
        return '📁'
    }
  }

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setUploadProgress(0)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const parseFile = async (file: File): Promise<{ headers: string[]; rows: (string | number)[][] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
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
                resolve({ headers, rows: dataRows })
              },
              error: (error) => reject(error),
            })
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('Failed to read CSV file'))
        reader.readAsText(file)
      })
    } else if (extension === 'xlsx' || extension === 'xls') {
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
            resolve({ headers, rows })
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('Failed to read Excel file'))
        reader.readAsArrayBuffer(file)
      })
    } else {
      throw new Error('Unsupported file type. Please upload CSV or Excel files.')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Parse file first to validate and get preview data
      setUploadProgress(20)
      const parsedData = await parseFile(selectedFile)

      // Create a unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      setUploadProgress(40)

      // Upload file to Supabase Storage with metadata
      const { error: uploadError, data } = await supabase.storage
        .from('files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type,
          metadata: {
            originalName: selectedFile.name,
            uploadedAt: new Date().toISOString(),
          },
        })

      if (uploadError) {
        throw uploadError
      }

      setUploadProgress(80)

      // Prepare preview data
      const previewData = {
        headers: parsedData.headers,
        rows: parsedData.rows,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        rowCount: parsedData.rows.length,
      }

      // Store preview data in sessionStorage
      sessionStorage.setItem('previewData', JSON.stringify(previewData))

      setUploadProgress(100)
      setIsUploading(false)

      // Navigate to preview page
      router.push('/preview')

      // Optionally, you can save file metadata to database here
      // await supabase.from('files').insert({
      //   user_id: user.id,
      //   file_name: selectedFile.name,
      //   file_path: filePath,
      //   file_size: selectedFile.size,
      //   file_type: selectedFile.type,
      // })
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to upload file'
      
      // Provide helpful error message for bucket not found
      if (err.message?.includes('Bucket not found') || err.message?.includes('bucket')?.toLowerCase().includes('not found')) {
        errorMessage = 'Storage bucket "files" not found. Please create a bucket named "files" in your Supabase Storage dashboard. See SUPABASE_SETUP.md for instructions.'
      }
      
      setError(errorMessage)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
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
      <div className="flex items-center justify-center min-h-screen px-4 pt-20 pb-6">
        <div className="w-full max-w-xl">
          {/* Header Section */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-light text-black tracking-tight mb-1">
              Upload Your Data
            </h1>
            <p className="text-xs text-black/60 mb-2">
              Drag and drop your file here, or click to browse
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-black/50">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Excel, CSV
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Up to 100MB
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed p-4 transition-all duration-300 ${
              isDragging
                ? 'border-black bg-black/5 scale-[1.01]'
                : 'border-black/20 hover:border-black/40 bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".xlsx,.xls,.csv,.pdf"
            />

            {!selectedFile ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-black/5 mb-3">
                  <span className="material-symbols-outlined text-2xl text-black/60">
                    cloud_upload
                  </span>
                </div>
                <p className="text-xs text-black/70 mb-1 font-medium">
                  Drop your file here
                </p>
                <p className="text-xs text-black/50 mb-4">
                  or click to browse
                </p>
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="px-5 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* File Preview */}
                <div className="flex items-start gap-3 p-3 bg-black/5 border border-black/10">
                  <div className="flex-shrink-0 text-3xl">{getFileIcon(selectedFile.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <h3 className="text-xs font-medium text-black truncate">
                        {selectedFile.name}
                      </h3>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="flex-shrink-0 text-black/40 hover:text-black transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-black/50">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span className="capitalize">
                        {selectedFile.name.split('.').pop()?.toUpperCase()} file
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-black/60">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!isUploading && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleUpload}
                      className="flex-1 px-4 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      Upload & Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleBrowseClick}
                      className="px-4 py-2 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all duration-300"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-black/5 border border-black/10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-sm text-black/70">security</span>
                <h4 className="text-xs font-medium text-black/80">Secure Upload</h4>
              </div>
              <p className="text-xs text-black/50 leading-tight">
                Your files are encrypted and processed securely
              </p>
            </div>
            <div className="p-3 bg-black/5 border border-black/10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-sm text-black/70">speed</span>
                <h4 className="text-xs font-medium text-black/80">Fast Processing</h4>
              </div>
              <p className="text-xs text-black/50 leading-tight">
                Quick conversion and analysis of your data
              </p>
            </div>
            <div className="p-3 bg-black/5 border border-black/10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-sm text-black/70">auto_awesome</span>
                <h4 className="text-xs font-medium text-black/80">Smart Detection</h4>
              </div>
              <p className="text-xs text-black/50 leading-tight">
                Automatic schema detection and mapping
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

