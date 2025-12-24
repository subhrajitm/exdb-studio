import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

interface ChatRequest {
  question: string
  userId: string
  history?: ChatMessage[]
  fileIds?: string[] // Optional: specific files to search
  dateRange?: {
    start?: string
    end?: string
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest
    const { question, userId, history = [], fileIds, dateRange } = body

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required.' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required.' },
        { status: 401 }
      )
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      )
    }

    // Get Supabase client
    const supabase = await createClient()

    // Build query to fetch user's files
    let filesQuery = supabase
      .from('files_metadata')
      .select('id, file_name, file_path, column_headers, row_count, sample_data, uploaded_at, category, tags')
      .eq('user_id', userId)
      .eq('is_indexed', true)
      .order('uploaded_at', { ascending: false })

    // Apply filters
    if (fileIds && fileIds.length > 0) {
      filesQuery = filesQuery.in('id', fileIds)
    }

    if (dateRange?.start) {
      filesQuery = filesQuery.gte('uploaded_at', dateRange.start)
    }

    if (dateRange?.end) {
      filesQuery = filesQuery.lte('uploaded_at', dateRange.end)
    }

    const { data: files, error: filesError } = await filesQuery.limit(50)

    if (filesError) {
      console.error('Error fetching files:', filesError)
      return NextResponse.json(
        { error: 'Failed to fetch files.' },
        { status: 500 }
      )
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        answer: "I don't have access to any files yet. Please upload some files first to ask questions about them.",
        sources: [],
      })
    }

    // Build context from files
    const filesContext = files
      .map((file, idx) => {
        const headers = (file.column_headers as string[]) || []
        const sampleData = (file.sample_data as any[][]) || []
        const rowCount = file.row_count || 0
        const uploadedDate = new Date(file.uploaded_at).toLocaleDateString()
        const category = file.category ? `Category: ${file.category}` : ''
        const tags = file.tags && (file.tags as string[]).length > 0 
          ? `Tags: ${(file.tags as string[]).join(', ')}` 
          : ''

        return `
File ${idx + 1}: ${file.file_name}
- Uploaded: ${uploadedDate}
- Rows: ${rowCount}
${category ? `- ${category}` : ''}
${tags ? `- ${tags}` : ''}
- Columns: ${headers.join(', ')}
- Sample data (first few rows):
${sampleData.slice(0, 3).map((row, i) => `  Row ${i + 1}: ${JSON.stringify(row)}`).join('\n')}
`
      })
      .join('\n---\n')

    // Build conversation history
    const historySummary =
      history.length > 0
        ? '\n\nPrevious conversation:\n' +
          history
            .slice(-6)
            .map(
              (m) =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            )
            .join('\n')
        : ''

    const systemPrompt = `
You are an intelligent document assistant that helps users understand and analyze their uploaded files.

You have access to metadata about the user's files including:
- File names and upload dates
- Column headers (schema)
- Row counts
- Sample data (first few rows)
- Categories and tags

Your capabilities:
1. Answer questions about specific files or across multiple files
2. Help users find files by name, date, or content
3. Analyze data patterns across files
4. Compare data between files
5. Provide insights about file contents
6. Suggest which files might be relevant for a query

Guidelines:
- Always cite which file(s) you're referring to
- If a question requires data that isn't in the sample, explain what analysis would be needed
- Be specific about file names and dates
- If you don't have enough information, say so clearly
- Use the file metadata to provide accurate answers
- When comparing files, reference them by name and date

Output format:
- Use clear, concise markdown
- Include file names in your answers
- Cite sources (file names) when referencing specific data
`.trim()

    const userPrompt = `
User Question: ${question.trim()}

Available Files:
${filesContext}
${historySummary}

Please answer the user's question based on the file metadata provided. If the question requires data analysis that goes beyond the sample rows, explain what would be needed or suggest using the visualization or export features.
`.trim()

    // Call Gemini API
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
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
      console.error('Gemini API error (chatbot):', error)
      return NextResponse.json(
        { error: 'Failed to generate answer using AI.' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!answer) {
      return NextResponse.json(
        { error: 'AI failed to generate an answer.' },
        { status: 502 }
      )
    }

    // Extract file names mentioned in the answer for sources
    const mentionedFiles = files
      .filter((file) => answer.toLowerCase().includes(file.file_name.toLowerCase()))
      .map((file) => file.file_name)

    // Update last_accessed_at for mentioned files
    if (mentionedFiles.length > 0) {
      const fileIdsToUpdate = files
        .filter((file) => mentionedFiles.includes(file.file_name))
        .map((file) => file.id)

      // Get current access counts
      const { data: currentFiles } = await supabase
        .from('files_metadata')
        .select('id, access_count')
        .in('id', fileIdsToUpdate)

      if (currentFiles) {
        // Update each file with incremented access count
        for (const file of currentFiles) {
          await supabase
            .from('files_metadata')
            .update({
              last_accessed_at: new Date().toISOString(),
              access_count: (file.access_count || 0) + 1,
            })
            .eq('id', file.id)
        }
      }
    }

    return NextResponse.json({
      answer,
      sources: mentionedFiles,
      fileCount: files.length,
    })
  } catch (err) {
    console.error('Chatbot error:', err)
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    )
  }
}

