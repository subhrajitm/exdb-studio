'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  timestamp: Date
}

interface FileOption {
  id: string
  file_name: string
  uploaded_at: string
  row_count: number
}

export default function ChatbotPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableFiles, setAvailableFiles] = useState<FileOption[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [showFileSelector, setShowFileSelector] = useState(false)
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadAvailableFiles()
      // Add welcome message
      setMessages([
        {
          role: 'assistant',
          content: `Hello! I'm your document assistant. I can help you:\n\n• Answer questions about your uploaded files\n• Find files by name, date, or content\n• Compare data across multiple files\n• Analyze patterns in your documents\n\nTry asking: "What files did I upload last week?" or "Show me all files with sales data"`,
          timestamp: new Date(),
        },
      ])
    }
  }, [user, loading, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAvailableFiles = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('files_metadata')
        .select('id, file_name, uploaded_at, row_count')
        .eq('user_id', user.id)
        .eq('is_indexed', true)
        .order('uploaded_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setAvailableFiles(data || [])
    } catch (err: any) {
      console.error('Error loading files:', err)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !user || isAsking) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsAsking(true)
    setError(null)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input.trim(),
          userId: user.id,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            sources: m.sources,
          })),
          fileIds: selectedFileIds.length > 0 ? selectedFileIds : undefined,
          dateRange: dateRange.start || dateRange.end ? dateRange : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      setError(err.message || 'Failed to get response')
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsAsking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickQuestions = [
    "What files did I upload this week?",
    "Show me all files with sales data",
    "Which files have the most rows?",
    "What files did I upload last month?",
  ]

  const handleQuickQuestion = (question: string) => {
    setInput(question)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
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
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col pt-20">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col px-4 pb-6">
          {/* Header */}
          <div className="mb-4">
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
                  Document Assistant
                </h1>
                <p className="text-xs text-black/60">
                  Ask questions about any of your uploaded files
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFileSelector(!showFileSelector)}
                  className="px-3 py-1.5 text-xs font-medium text-black/70 border border-black/20 hover:bg-black/5 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">
                    {showFileSelector ? 'filter_list' : 'filter_list_off'}
                  </span>
                  {selectedFileIds.length > 0 ? `${selectedFileIds.length} selected` : 'All Files'}
                </button>
              </div>
            </div>
          </div>

          {/* File Selector Panel */}
          {showFileSelector && (
            <div className="mb-4 p-4 bg-black/5 border border-black/10">
              <div className="mb-3">
                <h3 className="text-xs font-medium text-black/80 mb-2">Filter Files</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        setSelectedFileIds((prev) =>
                          prev.includes(file.id)
                            ? prev.filter((id) => id !== file.id)
                            : [...prev, file.id]
                        )
                      }}
                      className={`px-2.5 py-1 text-xs border transition-colors ${
                        selectedFileIds.includes(file.id)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black/70 border-black/20 hover:border-black/40'
                      }`}
                    >
                      {file.file_name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFileIds([])}
                    className="text-xs text-black/60 hover:text-black transition-colors"
                  >
                    Clear selection
                  </button>
                  <span className="text-xs text-black/40">|</span>
                  <span className="text-xs text-black/60">
                    {selectedFileIds.length === 0
                      ? 'Searching all files'
                      : `Searching ${selectedFileIds.length} file${selectedFileIds.length > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-black/60 mb-1 block">From Date</label>
                  <input
                    type="date"
                    value={dateRange.start || ''}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className="px-2 py-1 text-xs border border-black/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-black/60 mb-1 block">To Date</label>
                  <input
                    type="date"
                    value={dateRange.end || ''}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="px-2 py-1 text-xs border border-black/20"
                  />
                </div>
                {(dateRange.start || dateRange.end) && (
                  <button
                    onClick={() => setDateRange({})}
                    className="text-xs text-black/60 hover:text-black transition-colors mt-5"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-black/5 border border-black/10'
                  } p-3`}
                >
                  <div
                    className={`text-sm whitespace-pre-wrap ${
                      message.role === 'user' ? 'text-white' : 'text-black'
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/10">
                      <div className="text-xs text-black/60 mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map((source, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-black/10 text-xs text-black/70"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-black/40 mt-1.5">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex justify-start">
                <div className="bg-black/5 border border-black/10 p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-black/40 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-black/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-black/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="mb-4">
              <div className="text-xs text-black/60 mb-2">Try asking:</div>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(q)}
                    className="px-3 py-1.5 text-xs text-black/70 border border-black/20 hover:bg-black/5 hover:border-black/40 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your files..."
              className="flex-1 px-4 py-3 text-sm border border-black/20 focus:outline-none focus:border-black resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isAsking}
              className="px-6 py-3 text-sm font-medium text-white bg-black hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">send</span>
              Send
            </button>
          </div>

          {/* File Stats */}
          <div className="mt-4 pt-4 border-t border-black/10">
            <div className="flex items-center justify-between text-xs text-black/60">
              <span>
                {availableFiles.length} file{availableFiles.length !== 1 ? 's' : ''} available
              </span>
              <button
                onClick={loadAvailableFiles}
                className="text-black/60 hover:text-black transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

