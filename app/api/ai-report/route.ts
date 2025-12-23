import { NextResponse } from 'next/server'

interface GenerateReportRequest {
  fileName?: string
  audience?: string
  objective?: string
  callToAction?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateReportRequest

    const geminiKey = process.env.GEMINI_API_KEY

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    const { fileName, audience, objective, callToAction } = body

    const systemPrompt = `
You are an expert data storytelling assistant.

Goal: given a source data file name and context, design a concise report + slide deck outline.

Return ONLY valid JSON with this exact TypeScript shape:
{
  "reportTitle": string,
  "sections": Array<{
    "id": string,
    "type": "overview" | "key-metrics" | "trend" | "recommendations" | "custom",
    "title": string,
    "summary": string,
    "bullets": string[],
    "notes": string
  }>
}

Guidelines:
- Use simple, business-friendly language.
- Keep 3–6 sections total.
- One clear idea per section.
- 3–6 short bullets max per section.
- Notes are presenter notes (1–3 sentences).
`.trim()

    const userPrompt = `
Source file: ${fileName ?? 'Unknown'}
Audience: ${audience ?? 'General stakeholders'}
Objective: ${objective ?? 'Summarise the key insights'}
Primary call to action: ${callToAction ?? 'Agree on next steps'}
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
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!res.ok) {
      const error = await res.text()
      console.error('Gemini API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate report using Gemini.' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawContent) {
      return NextResponse.json(
        { error: 'AI failed to generate a response.' },
        { status: 502 }
      )
    }

    /* ============================
       JSON PARSING & VALIDATION
    ============================ */
    let parsed
    try {
      parsed = JSON.parse(rawContent)
    } catch (err) {
      console.error('Invalid JSON from AI:', rawContent)
      return NextResponse.json(
        { error: 'AI response was not valid JSON.' },
        { status: 422 }
      )
    }

    if (!parsed.reportTitle || !Array.isArray(parsed.sections)) {
      return NextResponse.json(
        { error: 'AI response missing required fields.' },
        { status: 422 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI report generation failed:', err)
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
