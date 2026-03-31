export type BibleBookId = 'genesis' | 'colossians'

export type BibleBook = {
  id: BibleBookId
  title: string
  chapters: number
  verseCounts: number[]
}

export const BIBLE_BOOKS: BibleBook[] = [
  {
    id: 'genesis',
    title: 'Genesis',
    chapters: 50,
    verseCounts: Array.from({ length: 50 }, () => 31),
  },
  {
    id: 'colossians',
    title: 'Colossians',
    chapters: 4,
    verseCounts: [29, 23, 25, 18],
  },
]

export function getBookById(bookId: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((book) => book.id === bookId)
}
