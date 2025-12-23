'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Card, TextArea, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { parseCsvBlob, parseExcelBlob, ParsedFile } from '@/lib/parseFile'

interface ResearchMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ResearchSchema {
  headers: string[]
  sampleRows: (string | number)[][]
  totalRows: number
}

export default function AIResearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const supabase = createClient()

  const [filePath, setFilePath] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [fileType, setFileType] = useState<string>('')

  const [schema, setSchema] = useState<ResearchSchema | null>(null)
  const [isLoadingSchema, setIsLoadingSchema] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const [question, setQuestion] = useState<string>('')
  const [messages, setMessages] = useState<ResearchMessage[]>([])
  const [isAsking, setIsAsking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [topic, setTopic] = useState<string>('')

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

  useEffect(() => {
    const loadSchema = async () => {
      if (!filePath || !fileName) {
        setIsLoadingSchema(false)
        return
      }

      try {
        setIsLoadingSchema(true)
        setSchemaError(null)

        const { data, error } = await supabase.storage.from('files').download(filePath)
        if (error) {
          throw error
        }
        if (!data) {
          throw new Error('File not found.')
        }

        const ext = fileName.split('.').pop()?.toLowerCase()
        let parsed: ParsedFile
        if (ext === 'csv') {
          parsed = await parseCsvBlob(data)
        } else if (ext === 'xlsx' || ext === 'xls') {
          parsed = await parseExcelBlob(data)
        } else {
          throw new Error('Unsupported file type. Please use CSV or Excel.')
        }

        const sampleRows = parsed.rows.slice(0, 10)
        setSchema({
          headers: parsed.headers,
          sampleRows,
          totalRows: parsed.rows.length,
        })
      } catch (err: any) {
        console.error(err)
        setSchemaError(err.message || 'Failed to load data for AI research.')
      } finally {
        setIsLoadingSchema(false)
      }
    }

    if (user && filePath && fileName) {
      loadSchema()
    }
  }, [user, filePath, fileName, supabase])

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return
    setIsAsking(true)
    setAiError(null)

    const newMessages: ResearchMessage[] = [
      ...messages,
      { role: 'user', content: question.trim() },
    ]
    setMessages(newMessages)

    try {
      const res = await fetch('/api/ai-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          question: topic ? `${topic.trim()} — ${question.trim()}` : question.trim(),
          schema,
          history: newMessages,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to get AI answer.')
      }

      const data = (await res.json()) as { answer: string }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ])
      setQuestion('')
    } catch (err: any) {
      console.error(err)
      setAiError(err.message || 'Something went wrong while asking AI.')
    } finally {
      setIsAsking(false)
    }
  }

  const handleQuickQuestion = (q: string) => {
    setQuestion(q)
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
            <div className="flex items-center justify-between mb-2 gap-4">
              <div>
                <h1 className="text-2xl font-light text-black tracking-tight mb-1">
                  AI Research
                </h1>
                <div className="flex items-center gap-3 text-xs text-black/60">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">description</span>
                    {fileName || 'No file selected'}
                  </span>
                  {schema && (
                    <>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">table_rows</span>
                        {schema.totalRows.toLocaleString()} rows
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">view_column</span>
                        {schema.headers.length} columns
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-black/50">
                <span className="material-symbols-outlined text-sm">psychology</span>
                <span>Ask natural questions. AI sees only a small sample, not your full dataset.</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white border border-black/10 p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: controls & schema */}
              <div className="space-y-4 lg:col-span-1">
                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-1.5">
                    Research setup
                  </h2>
                  <p className="text-xs text-black/60 mb-3">
                    Give AI a topic or angle. This helps guide follow-up questions and summaries.
                  </p>
                  <Input
                    id="topic"
                    label="Focus / topic (optional)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Revenue by region, User churn drivers, Funnel drop-off"
                  />
                </Card>

                <Card className="border-black/10" padding="lg">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-black">Data snapshot</h2>
                    {isLoadingSchema && (
                      <span className="text-[11px] text-black/50">Loading…</span>
                    )}
                  </div>
                  {schemaError && (
                    <p className="text-xs text-red-600 mb-2">{schemaError}</p>
                  )}
                  {schema ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-medium text-black/60 mb-1">
                          Columns
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {schema.headers.map((h) => (
                            <span
                              key={h}
                              className="px-2 py-0.5 text-[11px] border border-black/10 bg-black/2 text-black/70"
                            >
                              {h || '(unnamed)'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-black/60 mb-1">
                          Sample rows (first {schema.sampleRows.length})
                        </p>
                        <div className="border border-black/10 bg-white/60 max-h-40 overflow-auto">
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr className="bg-black/5">
                                {schema.headers.map((h, idx) => (
                                  <th
                                    key={idx}
                                    className="text-[11px] font-medium text-left px-2 py-1 border-b border-black/10"
                                  >
                                    {h || `col_${idx + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {schema.sampleRows.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-black/5">
                                  {schema.headers.map((_, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className="text-[11px] text-black/70 px-2 py-1 align-top"
                                    >
                                      {row[cIdx] ?? ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : !isLoadingSchema ? (
                    <p className="text-xs text-black/50">
                      Could not load a preview of this file. You can still ask high-level questions.
                    </p>
                  ) : null}
                </Card>

                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-2">
                    Quick questions
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Summarise the key trends in this dataset.',
                      'What anomalies or outliers should I investigate?',
                      'Suggest 5 charts or dashboards that would be insightful.',
                      'What hypotheses could explain recent changes in the metrics?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQuickQuestion(q)}
                        className="px-2 py-1 text-[11px] border border-black/15 text-black/70 hover:bg-black/5 text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right: conversation */}
              <div className="space-y-4 lg:col-span-2">
                <Card className="border-black/10" padding="lg">
                  <h2 className="text-sm font-medium text-black mb-2">
                    Ask questions about your data
                  </h2>
                  {aiError && (
                    <p className="mb-2 text-xs text-red-600">{aiError}</p>
                  )}
                  <div className="flex flex-col gap-2 mb-3">
                    <TextArea
                      id="question"
                      label="Your question"
                      rows={3}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g. How has revenue evolved over time by region, and where are we seeing the fastest growth or decline?"
                    />
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[11px] text-black/50">
                        Tip: Ask for comparisons, trends, anomalies, or concrete recommendations.
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleAsk}
                        disabled={isAsking || !question.trim()}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isAsking ? 'hourglass_empty' : 'play_arrow'}
                        </span>
                        <span>{isAsking ? 'Asking…' : 'Ask AI'}</span>
                      </Button>
                    </div>
                  </div>
                  <div className="border-t border-black/10 pt-3 max-h-[480px] overflow-y-auto pr-1 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-xs text-black/45">
                        Start by asking a question above. AI will respond here with insights, suggested charts, and follow-up questions.
                      </p>
                    )}
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          m.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 text-xs whitespace-pre-wrap ${
                            m.role === 'user'
                              ? 'bg-black text-white'
                              : 'bg-black/3 border border-black/10 text-black'
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-[0.16em] mb-1 opacity-60">
                            {m.role === 'user' ? 'You' : 'AI'}
                          </p>
                          <div>{m.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


