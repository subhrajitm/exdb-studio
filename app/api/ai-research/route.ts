import { NextResponse } from 'next/server'

interface ResearchMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ResearchSchema {
  headers: string[]
  sampleRows?: (string | number)[][]
  totalRows?: number
}

interface ResearchRequest {
  fileName?: string
  question: string
  schema?: ResearchSchema
  history?: ResearchMessage[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResearchRequest

    const geminiKey = process.env.GEMINI_API_KEY

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const { fileName, question, schema, history = [] } = body

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required.' },
        { status: 400 }
      )
    }

    const schemaSummary = schema
      ? `\n\nData schema:\n- Columns: ${schema.headers.join(', ') || 'Unknown'}${
          typeof schema.totalRows === 'number'
            ? `\n- Approx. rows: ${schema.totalRows}`
            : ''
        }${
          schema.sampleRows && schema.sampleRows.length
            ? `\n- Sample rows (truncated):\n${schema.sampleRows
                .slice(0, 5)
                .map((row, idx) => `  ${idx + 1}. ${JSON.stringify(row)}`)
                .join('\n')}`
            : ''
        }`
      : '\n\nData schema: (not provided)'

    const historySummary =
      history.length > 0
        ? '\n\nConversation so far:\n' +
          history
            .slice(-8)
            .map(
              (m) =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            )
            .join('\n')
        : ''

    const systemPrompt = `
You are an expert data analyst and research assistant.

You receive:
- Metadata about a tabular dataset (columns, approximate rows, and a few sample rows).
- A natural language research question and optional prior conversation.

Your job:
- Reason about patterns, distributions, and relationships that are likely in the data.
- Suggest concrete analyses, queries, and charts the user could run.
- When you refer to columns, ALWAYS use the exact header names.
- Clearly separate high-level insights, supporting evidence, and next steps.

Output:
- Use concise markdown with headings and bullet points.
- When useful, include example SQL-like or pseudo-code queries that could be applied to this dataset.
`.trim()

    const userPrompt = `
Source file: ${fileName ?? 'Unknown'}
Question: ${question.trim()}
${schemaSummary}
${historySummary}

Instructions:
- Stay grounded in the provided columns and sample rows.
- If something is ambiguous or impossible to know from the data alone, say so explicitly.
- Focus on actionable insights and follow-up questions the user should explore.
`.trim()

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        }),
      }
    )

    if (!res.ok) {
      const error = await res.text()
      console.error('Gemini API error (ai-research):', error)
      return NextResponse.json(
        { error: 'Failed to generate answer using Gemini.' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!answer) {
      return NextResponse.json(
        { error: 'AI failed to answer the question.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ answer })
  } catch (err) {
    console.error('AI research error:', err)
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    )
  }
}


