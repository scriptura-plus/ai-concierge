import { ChunkItem } from "./types";

export interface TextSplitterOptions {
  maxTokens?: number;      // ≈800–1000
  overlapTokens?: number;  // ≈80–120
}

export interface TextSplitter {
  split(markdown: string, opts?: TextSplitterOptions): Promise<ChunkItem[]>;
}