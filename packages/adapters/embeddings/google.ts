import { GoogleGenerativeAI, TaskType, type EmbedContentRequest, type Content } from "@google/generative-ai";

export interface EmbedRequest {
  texts: string[];
}

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  dim: number;
}

/**
 * Провайдер эмбеддингов для Google "text-embedding-004".
 * batchEmbedContents ожидает массив EmbedContentRequest, где
 * - content: Content (parts/text),
 * - taskType: TaskType (ENUM), а не строка.
 */
export class GoogleEmbeddingsProvider {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  }

  async embed(req: EmbedRequest): Promise<EmbedResult> {
    const requests: EmbedContentRequest[] = req.texts.map((text) => ({
      content: { parts: [{ text }] } as Content,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    }));

    const { embeddings = [] } = await this.model.batchEmbedContents({ requests });

    const vectors: number[][] = embeddings.map((e: any) => e.values ?? []);
    const dim = vectors[0]?.length ?? 0;

    return {
      embeddings: vectors,
      model: "text-embedding-004",
      dim,
    };
  }
}
