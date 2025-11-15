'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

interface FileItem {
  name: string
  id: string
  created_at: string
  updated_at: string
  metadata?: {
    size?: number
    mimetype?: string
    originalName?: string
  }
  // Supabase Storage list returns size directly, not always in metadata
  size?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [totalSize, setTotalSize] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filesPath, setFilesPath] = useState<string>('') // Track which path files are in
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadUserFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading])

  const verifyBucket = async () => {
    const { error: bucketError } = await supabase.storage
      .from('files')
      .list('', { limit: 1 })
    
    if (bucketError) {
      if (bucketError.message?.includes('not found') || bucketError.message?.includes('does not exist')) {
        setError('Storage bucket "files" not found. Please create a bucket named "files" in your Supabase Storage dashboard.')
      } else if (bucketError.message?.includes('policy') || bucketError.message?.includes('permission')) {
        setError('Permission denied accessing "files" bucket. Please check your storage policies.')
      } else {
        setError(`Error accessing bucket: ${bucketError.message}`)
      }
      return false
    }
    
    return true
  }

  const loadUserFiles = async () => {
    if (!user) return

    try {
      setIsLoadingFiles(true)
      setError(null)
      
      const folderPath = `uploads/${user.id}`
      
      // Verify bucket exists and is accessible
      const bucketAccessible = await verifyBucket()
      if (!bucketAccessible) {
        setIsLoadingFiles(false)
        return
      }
      
      // List files from user's folder in Supabase Storage
      let { data, error } = await supabase.storage
        .from('files')
        .list(folderPath, {
          limit: 100,
          offset: 0,
        })

      // Fallback: Check if files exist at root level (legacy path)
      if ((!data || data.length === 0) && !error) {
        const legacyPath = user.id
        
        const { data: legacyData, error: legacyError } = await supabase.storage
          .from('files')
          .list(legacyPath, {
            limit: 100,
            offset: 0,
          })
        
        if (legacyError) {
          // If permission error, it might be a storage policy issue
          if (legacyError.message?.includes('policy') || 
              legacyError.message?.includes('permission') || 
              legacyError.message?.includes('row-level security') ||
              legacyError.statusCode === '42501' ||
              legacyError.statusCode === 42501) {
            setError(`⚠️ Storage Policy Issue: Files exist at "${legacyPath}/" but your storage policy is blocking access. Please update your SELECT policy to allow access to root-level user folders.`)
          } else {
            setError(`Error accessing legacy path: ${legacyError.message}`)
          }
        } else if (legacyData && Array.isArray(legacyData) && legacyData.length > 0) {
          data = legacyData
          error = null
          setFilesPath(legacyPath) // Store legacy path
        }
      } else if (data && data.length > 0) {
        setFilesPath(folderPath) // Store standard path
      }

      if (error) {
        // If folder doesn't exist yet, that's okay - user just hasn't uploaded files
        if (
          error.message?.includes('not found') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('The resource was not found') ||
          error.statusCode === '404'
        ) {
          setFiles([])
          setTotalSize(0)
        } else {
          // Permission or other error
          setError(`Failed to load files: ${error.message || 'Unknown error'}. Please check your storage policies.`)
          setFiles([])
          setTotalSize(0)
        }
        setIsLoadingFiles(false)
        return
      }

      if (data && Array.isArray(data)) {
        // Process files and parse metadata if it's a string
        const processedData = data.map((file: any) => {
          let metadata = file.metadata
          // Supabase Storage sometimes returns metadata as a string, parse it if needed
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata)
            } catch (e) {
              metadata = {}
            }
          }
          
          return {
            ...file,
            metadata: metadata || {},
          }
        })
        
        // Sort by created_at descending (most recent first)
        const sortedData = processedData.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })
        
        setFiles(sortedData as FileItem[])
        // Calculate total size - check both size property and metadata.size
        const total = sortedData.reduce((sum, file) => {
          const fileSize = (file as any).size || (file as any).metadata?.size || 0
          return sum + fileSize
        }, 0)
        setTotalSize(total)
      } else {
        setFiles([])
        setTotalSize(0)
      }
      setIsLoadingFiles(false)
    } catch (err) {
      setError('Failed to load files. Please try again.')
      setFiles([])
      setTotalSize(0)
      setIsLoadingFiles(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return 'table_chart'
      case 'csv':
        return 'table_rows'
      case 'pdf':
        return 'picture_as_pdf'
      case 'doc':
      case 'docx':
        return 'description'
      case 'txt':
        return 'text_snippet'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return 'image'
      case 'zip':
      case 'rar':
      case '7z':
        return 'folder_zip'
      default:
        return 'insert_drive_file'
    }
  }

  const handleFileClick = async (file: FileItem) => {
    // Navigate to preview page with file path
    // Use the detected path (legacy or standard)
    const basePath = filesPath || `uploads/${user?.id}`
    const filePath = `${basePath}/${file.name}`
    
    // Use original name from metadata if available, otherwise use stored name
    const displayName = file.metadata?.originalName || file.name
    router.push(`/preview?path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(displayName)}&type=${encodeURIComponent(file.metadata?.mimetype || '')}`)
  }

  const getDisplayFileName = (file: FileItem): string => {
    // Return original filename from metadata if available, otherwise use stored name
    return file.metadata?.originalName || file.name
  }

  const getUserDisplayName = (): string => {
    if (!user) return 'User'
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  }

  if (loading || isLoadingFiles) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-black/60">Loading dashboard...</p>
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
      <div className="pt-20 pb-4 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-light text-black tracking-tight">
                Dashboard
              </h1>
              <p className="text-xs text-black/50 mt-1">{user.email}</p>
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-black/90 transition-all rounded-lg text-sm"
            >
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              <span>Upload</span>
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-red-600">error</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">Storage Policy Issue</p>
                  <p className="text-xs text-red-700 mb-2">{error}</p>
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer font-medium mb-1">View fix instructions</summary>
                    <div className="mt-2 p-2 bg-white rounded border border-red-200">
                      <ol className="space-y-1 list-decimal list-inside text-xs">
                        <li>Go to Supabase Dashboard → Storage → Policies → <code className="bg-red-100 px-1 rounded">files</code> bucket</li>
                        <li>Edit your SELECT policy</li>
                        <li>Use: <code className="bg-gray-100 px-1 rounded">bucket_id = 'files'::text AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.foldername(name))[0])</code></li>
                        <li>Save and refresh this page</li>
                      </ol>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-black/5 rounded-lg border border-black/10">
              <p className="text-xs text-black/60 mb-1">Files</p>
              <p className="text-2xl font-light text-black">{files.length}</p>
            </div>
            <div className="p-4 bg-black/5 rounded-lg border border-black/10">
              <p className="text-xs text-black/60 mb-1">Storage</p>
              <p className="text-2xl font-light text-black">{formatFileSize(totalSize)}</p>
            </div>
            <div className="p-4 bg-black/5 rounded-lg border border-black/10">
              <button
                onClick={loadUserFiles}
                className="w-full flex items-center justify-center gap-2 text-xs text-black/70 hover:text-black transition-colors"
                title="Refresh files"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Files Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-light text-black">
                {files.length > 0 ? 'Files' : 'No Files'}
              </h2>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-8 bg-black/5 rounded-lg border border-black/10">
                <span className="material-symbols-outlined text-4xl text-black/30 mb-2 inline-block">
                  folder_open
                </span>
                <p className="text-sm text-black/60 mb-3">No files uploaded yet</p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black hover:bg-black/90 transition-all rounded-lg"
                >
                  <span className="material-symbols-outlined">cloud_upload</span>
                  Upload File
                </Link>
              </div>
            ) : (
              <div className="bg-white border border-black/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black/5 border-b border-black/10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-black/70 uppercase">
                          File Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-black/70 uppercase">
                          Size
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-black/70 uppercase">
                          Uploaded
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {files.map((file, index) => (
                        <tr
                          key={file.id || file.name || index}
                          className="hover:bg-black/5 transition-colors cursor-pointer"
                          onClick={() => handleFileClick(file)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-xl text-black/60">
                                {getFileIcon(getDisplayFileName(file))}
                              </span>
                              <span className="font-medium text-black text-sm">{getDisplayFileName(file)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-black/60 text-sm">
                            {formatFileSize((file as any).size || file.metadata?.size || 0)}
                          </td>
                          <td className="px-4 py-3 text-black/60 text-sm">
                            {formatDate(file.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

