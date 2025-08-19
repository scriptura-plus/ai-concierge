export interface EmbeddingRequest {
  texts: string[];
  model?: string;      // 'google/embedding-001' | 'openai/text-embedding-3-small' | ...
}

export interface EmbeddingResponse {
  embeddings: number[][];   // shape: [N][D]
  model: string;
  dim: number;
  provider: string;       // 'google' | 'openai' | 'local'
}

export interface EmbeddingsProvider {
  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}