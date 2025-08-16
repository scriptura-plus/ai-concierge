import { EmbeddingsProvider, EmbeddingRequest, EmbeddingResponse } from '@core/embeddings';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GoogleEmbeddingsProvider implements EmbeddingsProvider {
  private client: GoogleGenerativeAI;
  private readonly defaultModel = 'embedding-001';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Google API key is required");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const modelName = req.model ?? this.defaultModel;
    const model = this.client.getGenerativeModel({ model: modelName });

    // Используем batchEmbedContents для эффективной обработки сразу нескольких чанков
    const result = await model.batchEmbedContents({
      requests: req.texts.map(text => ({ content: text, taskType: "RETRIEVAL_DOCUMENT" }))
    });

    const { embeddings } = result;

    if (!embeddings || embeddings.length !== req.texts.length) {
      throw new Error("Mismatch between number of texts and embeddings returned.");
    }

    return {
      embeddings: embeddings.map(e => e.values),
      model: modelName,
      dim: embeddings[0].values.length,
      provider: 'google',
    };
  }
}