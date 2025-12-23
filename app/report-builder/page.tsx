'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Card, Input, Tabs, TextArea } from '@/components/ui'

type SectionType = 'overview' | 'key-metrics' | 'trend' | 'recommendations' | 'custom'

interface ReportSection {
  id: string
  type: SectionType
  title: string
  summary: string
  bullets: string
  notes?: string
}

function createDefaultSections(fileName: string): ReportSection[] {
  const baseName = fileName.replace(/\.[^/.]+$/, '')
  return [
    {
      id: 'overview',
      type: 'overview',
      title: 'Executive Summary',
      summary: `High-level overview of insights from ${baseName}.`,
      bullets: [
        'Overall performance and key highlights',
        'Notable anomalies or trends',
        'Business impact in 1–2 sentences',
      ].join('\n'),
    },
    {
      id: 'metrics',
      type: 'key-metrics',
      title: 'Key Metrics',
      summary: 'Call out 3–5 metrics that matter most for this audience.',
      bullets: ['Metric 1 — what changed and why it matters', 'Metric 2 — compare to previous period'].join(
        '\n'
      ),
    },
    {
      id: 'recommendations',
      type: 'recommendations',
      title: 'Recommendations & Next Steps',
      summary: 'Turn insights into concrete actions and owners.',
      bullets: ['Action 1 — owner & timeline', 'Action 2 — owner & timeline'].join('\n'),
    },
  ]
}

export default function ReportBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [fileName, setFileName] = useState<string>('')
  const [mode, setMode] = useState<'report' | 'slides'>('report')
  const [reportTitle, setReportTitle] = useState<string>('')
  const [reportObjective, setReportObjective] = useState<string>('')
  const [audience, setAudience] = useState<string>('')
  const [callToAction, setCallToAction] = useState<string>('')
  const [sections, setSections] = useState<ReportSection[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPresenting, setIsPresenting] = useState(false)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    const path = searchParams.get('path')
    const name = searchParams.get('name') || 'file'

    if (path) {
      setFileName(name)
      const initialTitle = `${name.replace(/\.[^/.]+$/, '')} — Report`
      setReportTitle(initialTitle)
      const defaults = createDefaultSections(name)
      setSections(defaults)
      setActiveSectionId(defaults[0]?.id ?? null)
    } else {
      router.push('/dashboard')
    }
  }, [loading, user, searchParams, router])

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null,
    [sections, activeSectionId]
  )

  const handleSectionChange = (field: keyof ReportSection, value: string) => {
    if (!activeSection) return
    setSections((prev) =>
      prev.map((section) =>
        section.id === activeSection.id
          ? {
              ...section,
              [field]: value,
            }
          : section
      )
    )
  }

  const handleAddSection = () => {
    const id = `section-${Date.now()}`
    const newSection: ReportSection = {
      id,
      type: 'custom',
      title: 'New Section',
      summary: 'Describe the purpose of this section.',
      bullets: '',
      notes: '',
    }
    setSections((prev) => [...prev, newSection])
    setActiveSectionId(id)
  }

  const handleRemoveSection = (id: string) => {
    if (sections.length <= 1) return
    const nextSections = sections.filter((s) => s.id !== id)
    setSections(nextSections)
    if (activeSectionId === id) {
      setActiveSectionId(nextSections[0]?.id ?? null)
    }
  }

  const handleGenerateWithAI = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setAiError(null)

    try {
      const res = await fetch('/api/ai-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          audience,
          objective: reportObjective,
          callToAction,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to generate report with AI.')
      }

      const data = (await res.json()) as {
        reportTitle?: string
        sections?: {
          id?: string
          type?: SectionType
          title?: string
          summary?: string
          bullets?: string[]
          notes?: string
        }[]
      }

      const nextSections: ReportSection[] =
        data.sections?.map((s, index) => ({
          id: s.id || `ai-section-${index}`,
          type: s.type || 'custom',
          title: s.title || 'Untitled section',
          summary: s.summary || '',
          bullets: (s.bullets || []).join('\n'),
          notes: s.notes || '',
        })) || []

      if (!nextSections.length) {
        throw new Error('AI did not return any sections.')
      }

      if (data.reportTitle) {
        setReportTitle(data.reportTitle)
      }

      setSections(nextSections)
      setActiveSectionId(nextSections[0]?.id ?? null)
    } catch (err: any) {
      console.error(err)
      setAiError(err.message || 'Something went wrong while using AI.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportMarkdown = () => {
    if (!sections.length || isExporting) return
    try {
      setIsExporting(true)
      const safeTitle = (reportTitle || fileName || 'report').replace(/[^\w\- ]+/g, '').trim()
      const titleLine = `# ${reportTitle || 'Report'}`
      const metaLines = [
        fileName ? `Source file: ${fileName}` : null,
        audience ? `Audience: ${audience}` : null,
        reportObjective ? `Objective: ${reportObjective}` : null,
        callToAction ? `Primary CTA: ${callToAction}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      const sectionBlocks = sections
        .map((section, index) => {
          const header = `\n## ${index + 1}. ${section.title || 'Section'}`
          const typeLabel =
            section.type !== 'custom'
              ? `\n_Type: ${section.type.replace('-', ' ')}_`
              : ''
          const summary = section.summary ? `\n\n${section.summary}` : ''
          const bullets =
            section.bullets && section.bullets.trim().length > 0
              ? '\n\n- ' +
                section.bullets
                  .split('\n')
                  .map((b) => b.trim())
                  .filter(Boolean)
                  .join('\n- ')
              : ''
          const notes =
            section.notes && section.notes.trim().length > 0
              ? `\n\n> Presenter notes:\n> ${section.notes.replace(/\n/g, '\n> ')}`
              : ''
          return `${header}${typeLabel}${summary}${bullets}${notes}`
        })
        .join('\n')

      const markdown = [titleLine, metaLines ? `\n${metaLines}\n` : '', sectionBlocks]
        .filter(Boolean)
        .join('\n')

      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeTitle || 'report'}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const slides = useMemo(
    () =>
      sections.map((section, index) => {
        const bullets = section.bullets
          ? section.bullets
              .split('\n')
              .map((b) => b.trim())
              .filter(Boolean)
          : []
        return {
          id: section.id,
          index,
          title: section.title || `Slide ${index + 1}`,
          summary: section.summary,
          bullets,
        }
      }),
    [sections]
  )

  const currentSlide = slides[activeSlideIndex] ?? slides[0] ?? null

  const handleStartPresentation = () => {
    if (!slides.length) return
    setActiveSlideIndex(0)
    setIsPresenting(true)
  }

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => Math.min(prev + 1, slides.length - 1))
  }

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => Math.max(prev - 1, 0))
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
                  Report &amp; Presentation Builder
                </h1>
                <div className="flex items-center gap-3 text-xs text-black/60">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">description</span>
                    {fileName || 'No file selected'}
                  </span>
                  {sections.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">view_list</span>
                      {sections.length} sections
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('report')}
                  className={`px-3 py-1.5 text-xs border text-black/70 hover:text-black transition-all ${
                    mode === 'report'
                      ? 'border-black bg-black text-white'
                      : 'border-black/20 bg-white hover:border-black/40'
                  }`}
                >
                  Report view
                </button>
                <button
                  onClick={() => setMode('slides')}
                  className={`px-3 py-1.5 text-xs border text-black/70 hover:text-black transition-all ${
                    mode === 'slides'
                      ? 'border-black bg-black text-white'
                      : 'border-black/20 bg-white hover:border-black/40'
                  }`}
                >
                  Slide view
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white border border-black/10 p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Configuration */}
              <div className="space-y-4">
                <Card className="border-black/10" padding="lg">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-sm font-medium text-black">Report blueprint</h2>
                      <p className="text-xs text-black/50">
                        Define title, audience and the story you want to tell. Let AI propose a first draft.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleGenerateWithAI}
                        disabled={isGenerating}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isGenerating ? 'hourglass_empty' : 'sparkles'}
                        </span>
                        <span>{isGenerating ? 'Generating…' : 'Generate with AI'}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleExportMarkdown}
                        disabled={!sections.length || isExporting}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isExporting ? 'hourglass_empty' : 'download'}
                        </span>
                        <span>{isExporting ? 'Exporting...' : 'Export as Markdown'}</span>
                      </Button>
                    </div>
                  </div>
                  {aiError && (
                    <p className="mb-2 text-xs text-red-600">
                      {aiError}
                    </p>
                  )}
                  <div className="space-y-3">
                    <Input
                      label="Report title"
                      id="report-title"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="e.g. Monthly Performance Review — March"
                    />
                    <Input
                      label="Audience"
                      id="report-audience"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="e.g. Leadership, Product, Finance"
                    />
                    <TextArea
                      label="Objective"
                      id="report-objective"
                      rows={2}
                      value={reportObjective}
                      onChange={(e) => setReportObjective(e.target.value)}
                      placeholder="What decision should this report or deck unlock?"
                    />
                    <TextArea
                      label="Primary call to action"
                      id="report-cta"
                      rows={2}
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      placeholder="What should the audience do after reading this?"
                    />
                  </div>
                </Card>

                <Card className="border-black/10" padding="lg">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-sm font-medium text-black">Sections</h2>
                      <p className="text-xs text-black/50">
                        Arrange the narrative structure of your report &amp; slides.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddSection}>
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Add section</span>
                    </Button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSectionId(section.id)}
                        className={`px-3 py-2 text-xs border rounded-sm flex items-center gap-1 whitespace-nowrap ${
                          activeSection?.id === section.id
                            ? 'border-black bg-black text-white'
                            : 'border-black/15 bg-white hover:border-black/40 text-black/70 hover:text-black'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {section.type === 'overview'
                            ? 'analytics'
                            : section.type === 'key-metrics'
                            ? 'monitoring'
                            : section.type === 'trend'
                            ? 'trending_up'
                            : section.type === 'recommendations'
                            ? 'task_alt'
                            : 'notes'}
                        </span>
                        <span className="max-w-[160px] truncate">{section.title || 'Untitled'}</span>
                        {sections.length > 1 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveSection(section.id)
                            }}
                            className="material-symbols-outlined text-xs opacity-60 hover:opacity-100"
                          >
                            close
                          </span>
                        )}
                      </button>
                    ))}
                    {!sections.length && (
                      <p className="text-xs text-black/40">No sections yet. Add your first section to begin.</p>
                    )}
                  </div>

                  {activeSection && (
                    <div className="mt-4 space-y-3">
                      <Input
                        label="Section title"
                        id="section-title"
                        value={activeSection.title}
                        onChange={(e) => handleSectionChange('title', e.target.value)}
                        placeholder="e.g. Revenue overview, User growth"
                      />
                      <TextArea
                        label="Section summary"
                        id="section-summary"
                        rows={3}
                        value={activeSection.summary}
                        onChange={(e) => handleSectionChange('summary', e.target.value)}
                        placeholder="1–3 sentences capturing the core insight of this section."
                      />
                      <TextArea
                        label="Talking points (one per line)"
                        id="section-bullets"
                        rows={4}
                        value={activeSection.bullets}
                        onChange={(e) => handleSectionChange('bullets', e.target.value)}
                        placeholder="- What changed?
- Why did it change?
- What should we do about it?"
                      />
                      <TextArea
                        label="Presenter notes (optional)"
                        id="section-notes"
                        rows={3}
                        value={activeSection.notes || ''}
                        onChange={(e) => handleSectionChange('notes', e.target.value)}
                        placeholder="Private notes for whoever is presenting this slide."
                      />
                    </div>
                  )}
                </Card>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <Card className="border-black/10" padding="lg">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-sm font-medium text-black">Live preview</h2>
                      <p className="text-xs text-black/50">
                        Toggle between report and slide layout. This does not change your content.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleStartPresentation}
                        disabled={!slides.length}
                      >
                        <span className="material-symbols-outlined text-sm">slideshow</span>
                        <span>Present</span>
                      </Button>
                    </div>
                  </div>

                  <Tabs
                    defaultTab={mode}
                    className="mt-2"
                    tabs={[
                      {
                        id: 'report',
                        label: 'Report layout',
                        content: (
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.12em] text-black/40 mb-1">
                                Report
                              </p>
                              <h3 className="text-lg font-medium text-black mb-1">
                                {reportTitle || 'Untitled report'}
                              </h3>
                              <p className="text-xs text-black/50">
                                {audience && <span>For {audience}. </span>}
                                {reportObjective || 'Use this space to briefly state the goal of this report.'}
                              </p>
                            </div>
                            <div className="border-t border-black/5 pt-3 space-y-3 max-h-[420px] overflow-y-auto">
                              {sections.map((section, index) => {
                                const bullets = section.bullets
                                  ? section.bullets
                                      .split('\n')
                                      .map((b) => b.trim())
                                      .filter(Boolean)
                                  : []
                                return (
                                  <div key={section.id} className="border border-black/5 p-3 bg-white/80">
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 mb-1">
                                      Section {index + 1}
                                    </p>
                                    <h4 className="text-sm font-medium text-black mb-1">
                                      {section.title || 'Untitled section'}
                                    </h4>
                                    {section.summary && (
                                      <p className="text-xs text-black/60 mb-2">{section.summary}</p>
                                    )}
                                    {bullets.length > 0 && (
                                      <ul className="list-disc pl-4 space-y-1">
                                        {bullets.map((b, i) => (
                                          <li key={i} className="text-xs text-black/70">
                                            {b}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )
                              })}
                              {!sections.length && (
                                <p className="text-xs text-black/40">
                                  Add sections on the left to see them here.
                                </p>
                              )}
                              {callToAction && (
                                <div className="border border-black/10 bg-black text-white p-3 mt-1">
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-white/60 mb-1">
                                    Call to action
                                  </p>
                                  <p className="text-xs">{callToAction}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      },
                      {
                        id: 'slides',
                        label: 'Slide layout',
                        content: (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] text-black/50 mb-1">
                              <span>
                                {slides.length > 0
                                  ? `Slide ${Math.min(activeSlideIndex + 1, slides.length)} of ${slides.length}`
                                  : 'No slides yet'}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={handlePrevSlide}
                                  disabled={activeSlideIndex === 0 || !slides.length}
                                  className="px-2 py-1 border border-black/15 text-[11px] disabled:opacity-40"
                                >
                                  ‹
                                </button>
                                <button
                                  onClick={handleNextSlide}
                                  disabled={!slides.length || activeSlideIndex >= slides.length - 1}
                                  className="px-2 py-1 border border-black/15 text-[11px] disabled:opacity-40"
                                >
                                  ›
                                </button>
                              </div>
                            </div>
                            <div className="aspect-video border border-black/10 bg-black/95 text-white relative overflow-hidden flex items-center justify-center">
                              {currentSlide ? (
                                <div className="w-[92%] h-[86%]">
                                  <div className="flex items-center justify-between text-[10px] text-white/60 mb-2">
                                    <span>{reportTitle || 'Untitled deck'}</span>
                                    <span>
                                      {fileName && (
                                        <>
                                          <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">
                                            description
                                          </span>
                                          <span className="align-middle">{fileName}</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <h3 className="text-xl font-semibold mb-2 leading-snug">
                                    {currentSlide.title}
                                  </h3>
                                  {currentSlide.summary && (
                                    <p className="text-xs text-white/70 mb-3 max-w-[80%]">
                                      {currentSlide.summary}
                                    </p>
                                  )}
                                  {currentSlide.bullets.length > 0 && (
                                    <ul className="list-disc pl-5 space-y-1.5 max-w-[80%]">
                                      {currentSlide.bullets.map((b, i) => (
                                        <li key={i} className="text-xs text-white/90">
                                          {b}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {!currentSlide.bullets.length && !currentSlide.summary && (
                                    <p className="text-xs text-white/40">
                                      Add summary or talking points to fill this slide.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-white/40">
                                  Slides will appear here as you add sections.
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      },
                    ]}
                    onTabChange={(tabId) => setMode(tabId === 'slides' ? 'slides' : 'report')}
                  />
                </Card>
              </div>
            </div>
          </div>

          {/* Presentation overlay */}
          {isPresenting && currentSlide && (
            <div className="fixed inset-0 z-40 bg-black/95 text-white flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{reportTitle || 'Presentation'}</span>
                  <span className="text-white/50">
                    Slide {activeSlideIndex + 1} of {slides.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevSlide}
                    disabled={activeSlideIndex === 0}
                    className="px-2 py-1 border border-white/20 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={handleNextSlide}
                    disabled={activeSlideIndex >= slides.length - 1}
                    className="px-2 py-1 border border-white/20 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setIsPresenting(false)}
                    className="px-3 py-1 border border-white/40 text-xs"
                  >
                    Exit
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-5xl aspect-video border border-white/20 bg-black flex items-center justify-center">
                  <div className="w-[92%] h-[86%]">
                    <div className="flex items-center justify-between text-[11px] text-white/60 mb-3">
                      <span>{reportTitle || 'Untitled deck'}</span>
                      {fileName && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">description</span>
                          <span>{fileName}</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl font-semibold mb-3 leading-tight">
                      {currentSlide.title}
                    </h2>
                    {currentSlide.summary && (
                      <p className="text-sm text-white/70 mb-4 max-w-[80%]">
                        {currentSlide.summary}
                      </p>
                    )}
                    {currentSlide.bullets.length > 0 && (
                      <ul className="list-disc pl-6 space-y-2 max-w-[80%]">
                        {currentSlide.bullets.map((b, i) => (
                          <li key={i} className="text-sm text-white">
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
