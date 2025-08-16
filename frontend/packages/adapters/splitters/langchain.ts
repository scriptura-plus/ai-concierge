import { TextSplitter, TextSplitterOptions, ChunkItem } from '@core/splitter';
// ИСПРАВЛЕННАЯ СТРОКА:
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export class LangchainTextSplitter implements TextSplitter {
  async split(markdown: string, opts: TextSplitterOptions = {}): Promise<ChunkItem[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      // Устанавливаем размеры чанков по умолчанию, если они не заданы
      chunkSize: opts.maxTokens ?? 1000,
      chunkOverlap: opts.overlapTokens ?? 200,
    });

    // Используем сплиттер из Langchain для создания документов
    const documents = await splitter.createDocuments([markdown]);

    // Преобразуем результат в наш формат ChunkItem
    return documents.map((doc, index) => ({
      content: doc.pageContent,
      meta: {
        position: index,
      },
    }));
  }
}