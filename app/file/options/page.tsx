'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'

interface FileInfo {
  path: string
  name: string
  type: string
}

export default function FileOptionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    const filePath = searchParams.get('path')
    const fileName = searchParams.get('name') || 'file'
    const fileType = searchParams.get('type') || ''

    if (filePath && fileName) {
      setFileInfo({
        path: filePath,
        name: fileName,
        type: fileType,
      })
    } else {
      router.push('/dashboard')
    }
  }, [loading, user, searchParams, router])

  const buildPreviewUrl = useCallback(() => {
    if (!fileInfo) return '/dashboard'
    return `/preview?path=${encodeURIComponent(fileInfo.path)}&name=${encodeURIComponent(fileInfo.name)}&type=${encodeURIComponent(fileInfo.type)}`
  }, [fileInfo])

  const buildFeatureUrl = useCallback((feature: string) => {
    if (!fileInfo) return '/dashboard'
    return `/${feature}?path=${encodeURIComponent(fileInfo.path)}&name=${encodeURIComponent(fileInfo.name)}&type=${encodeURIComponent(fileInfo.type)}`
  }, [fileInfo])

  const features = useMemo(() => [
    {
      id: 'preview',
      title: 'Preview',
      description: 'View and edit your data in an Excel-like interface',
      icon: 'visibility',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      iconColor: 'text-blue-600',
      link: buildPreviewUrl(),
      available: true,
    },
    {
      id: 'db-converter',
      title: 'DB Converter',
      description: 'Convert Excel/CSV files to SQL or NoSQL databases',
      icon: 'database',
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      iconColor: 'text-green-600',
      link: buildFeatureUrl('db-converter'),
      available: true,
    },
    {
      id: 'report-builder',
      title: 'Report & Presentation Builder',
      description: 'Create reports and presentations from your data',
      icon: 'description',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      iconColor: 'text-purple-600',
      link: buildFeatureUrl('report-builder'),
      available: true,
    },
    {
      id: 'ai-research',
      title: 'AI Research',
      description: 'Get insights and analysis using AI',
      icon: 'psychology',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      iconColor: 'text-orange-600',
      link: buildFeatureUrl('ai-research'),
      available: true,
    },
    {
      id: 'data-visualization',
      title: 'Data Visualization',
      description: 'Create charts and graphs from your data',
      icon: 'bar_chart',
      color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
      iconColor: 'text-indigo-600',
      link: buildFeatureUrl('visualization'),
      available: true,
    },
    {
      id: 'export-format',
      title: 'Export Formats',
      description: 'Export to various formats (JSON, PDF, etc.)',
      icon: 'download',
      color: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
      iconColor: 'text-teal-600',
      link: buildFeatureUrl('export'),
      available: true,
    },
  ], [buildPreviewUrl, buildFeatureUrl])

  if (loading || !fileInfo) {
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
                  Choose an Action
                </h1>
                <div className="flex items-center gap-3 text-xs text-black/60">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">description</span>
                    {fileInfo.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Link
                key={feature.id}
                href={feature.link}
                className={`block p-4 border-2 transition-all duration-300 ${feature.color} ${
                  !feature.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={(e) => {
                  if (!feature.available) {
                    e.preventDefault()
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center ${feature.iconColor} bg-white border border-current`}>
                    <span className="material-symbols-outlined text-xl">
                      {feature.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-black mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-black/60 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-black/10">
            <h2 className="text-sm font-medium text-black mb-3">Quick Actions</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={buildPreviewUrl()}
                className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-black/90 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                Open Preview
              </Link>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

