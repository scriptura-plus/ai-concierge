import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@core/supabase';
import { GoogleEmbeddingsProvider } from '@adapters/embeddings/google';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { question, tenantId } = await req.json();

    if (!question || !tenantId) {
      return NextResponse.json({ error: 'Question and tenantId are required' }, { status: 400 });
    }

    // 1. Преобразуем вопрос в вектор
    const embeddingsProvider = new GoogleEmbeddingsProvider(process.env.GOOGLE_API_KEY!);
    const embeddingResponse = await embeddingsProvider.embed({ texts: [question] });
    const questionEmbedding = embeddingResponse.embeddings[0];

    // 2. Ищем похожие чанки в Supabase (быстрый поиск в базе данных)
    const supabase = getSupabaseAdmin();
    const { data: chunks, error: matchError } = await supabase.rpc('match_documents', {
      p_tenant_id: tenantId,
      p_query_embedding: questionEmbedding,
      p_match_threshold: 0.7, // Порог схожести
      p_match_count: 5        // Количество чанков
    });

    if (matchError) {
      throw new Error(`Failed to search for chunks: ${matchError.message}`);
    }

    // 3. Собираем контекст и генерируем финальный промпт
    const contextText = chunks.map((chunk: any) => chunk.content).join("\n\n---\n\n");

    const prompt = `Answer the user's QUESTION based ONLY on the provided CONTEXT. If the answer is not in the context, say "I don't have enough information to answer that question."

CONTEXT:
${contextText}

QUESTION:
${question}

ANSWER:
`;

    // 4. Отправляем в Gemini для генерации ответа
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error('[Ask API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}