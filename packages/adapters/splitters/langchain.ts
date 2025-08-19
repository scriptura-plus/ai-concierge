import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface TextChunk {
  content: string;
  index: number;
  meta: { position: number; [key: string]: any };
}

/**
 * Обёртка над LangChain splitters: режем текст на чанки.
 */
export class LangchainTextSplitter {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(opts?: { chunkSize?: number; chunkOverlap?: number }) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: opts?.chunkSize ?? 1000,
      chunkOverlap: opts?.chunkOverlap ?? 200,
      separators: ['\n\n', '\n', ' ', ''],
    });
  }

  async split(text: string): Promise<TextChunk[]> {
    const docs = await this.splitter.createDocuments([text]);
    return docs.map((d, i) => ({
      content: d.pageContent,
      index: i,
      meta: { position: i },
    }));
  }
}

export default LangchainTextSplitter;
