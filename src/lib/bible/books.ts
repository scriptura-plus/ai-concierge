export type BibleBookId = 'genesis'

export type BibleBook = {
  id: BibleBookId
  title: string
  chapters: number
}

export const BIBLE_BOOKS: BibleBook[] = [
  {
    id: 'genesis',
    title: 'Genesis',
    chapters: 50,
  },
]

export function getBookById(bookId: string): BibleBook | undefined {
  return BIBLE_BOOKS.find((book) => book.id === bookId)
}
