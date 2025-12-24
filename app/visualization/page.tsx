'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'

export default function VisualizationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [filePath, setFilePath] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [fileType, setFileType] = useState<string>('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    const path = searchParams.get('path')
    const name = searchParams.get('name') || 'file'
    const type = searchParams.get('type') || ''

    if (path) {
      setFilePath(path)
      setFileName(name)
      setFileType(type)
    } else {
      router.push('/dashboard')
    }
  }, [loading, user, searchParams, router])

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
                <h1 className="text-2xl font-light text-black tracking-tight mb-1">
                  Data Visualization
                </h1>
                <div className="flex items-center gap-3 text-xs text-black/60">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">description</span>
                    {fileName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white border border-black/10 p-6">
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-black/20 mb-4 inline-block">
                bar_chart
              </span>
              <h2 className="text-lg font-light text-black mb-2">Data Visualization</h2>
              <p className="text-sm text-black/60 mb-6">
                Create charts and graphs from your data
              </p>
              <p className="text-xs text-black/40">
                This feature is coming soon. We're working on it!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

