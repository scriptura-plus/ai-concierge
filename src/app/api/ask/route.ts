import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@core/supabase';
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

    // 1. Создаем вектор из вопроса пользователя
    console.log('[Ask API] Creating embedding for question...');
    const embeddingsProvider = new GoogleEmbeddingsProvider(process.env.GOOGLE_API_KEY!);
    const embeddingResponse = await embeddingsProvider.embed({ texts: [question] });
    const questionEmbedding = embeddingResponse.embeddings[0];
    console.log('[Ask API] Embedding created.');

    // 2. Ищем похожие чанки в базе данных с помощью функции match_documents
    console.log('[Ask API] Searching for similar chunks in Supabase...');
    const { data: chunks, error: matchError } = await supabaseAdmin.rpc('match_documents', {
      p_tenant_id: tenantId,
      p_query_embedding: questionEmbedding,
      p_match_threshold: 0.7, // Порог схожести (от 0 до 1)
      p_match_count: 5        // Количество самых похожих чанков
    });

    if (matchError) {
      console.error('[Ask API] Supabase match_documents error:', matchError);
      throw new Error(`Failed to search for chunks: ${matchError.message}`);
    }
    console.log(`[Ask API] Found ${chunks.length} matching chunks.`);

    // 3. Собираем контекст и генерируем финальный промпт
    const contextText = chunks.map((chunk: any) => chunk.content).join("\n\n---\n\n");
    
    const prompt = `You are a helpful AI assistant. Answer the user's QUESTION based ONLY on the provided CONTEXT. If the answer is not in the context, say "I don't have enough information to answer that question."

CONTEXT:
${contextText}

QUESTION:
${question}

ANSWER:
`;

    // 4. Отправляем финальный промпт в Gemini для генерации ответа
    console.log('[Ask API] Generating final answer with Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    console.log('[Ask API] Gemini generated answer.');

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error('[Ask API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}