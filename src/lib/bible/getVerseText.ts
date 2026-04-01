type BibleApiVerse = {
  verse?: number
  text?: string
}

type BibleApiChapterResponse = {
  verses?: BibleApiVerse[]
}

const BOOK_TO_WEB_ID: Record<string, string> = {
  genesis: 'GEN',
  exodus: 'EXO',
  leviticus: 'LEV',
  numbers: 'NUM',
  deuteronomy: 'DEU',
  joshua: 'JOS',
  judges: 'JDG',
  ruth: 'RUT',
  '1samuel': '1SA',
  '2samuel': '2SA',
  '1kings': '1KI',
  '2kings': '2KI',
  '1chronicles': '1CH',
  '2chronicles': '2CH',
  ezra: 'EZR',
  nehemiah: 'NEH',
  esther: 'EST',
  job: 'JOB',
  psalms: 'PSA',
  proverbs: 'PRO',
  ecclesiastes: 'ECC',
  songofsolomon: 'SNG',
  isaiah: 'ISA',
  jeremiah: 'JER',
  lamentations: 'LAM',
  ezekiel: 'EZK',
  daniel: 'DAN',
  hosea: 'HOS',
  joel: 'JOL',
  amos: 'AMO',
  obadiah: 'OBA',
  jonah: 'JON',
  micah: 'MIC',
  nahum: 'NAM',
  habakkuk: 'HAB',
  zephaniah: 'ZEP',
  haggai: 'HAG',
  zechariah: 'ZEC',
  malachi: 'MAL',
  matthew: 'MAT',
  mark: 'MRK',
  luke: 'LUK',
  john: 'JHN',
  acts: 'ACT',
  romans: 'ROM',
  '1corinthians': '1CO',
  '2corinthians': '2CO',
  galatians: 'GAL',
  ephesians: 'EPH',
  philippians: 'PHP',
  colossians: 'COL',
  '1thessalonians': '1TH',
  '2thessalonians': '2TH',
  '1timothy': '1TI',
  '2timothy': '2TI',
  titus: 'TIT',
  philemon: 'PHM',
  hebrews: 'HEB',
  james: 'JAS',
  '1peter': '1PE',
  '2peter': '2PE',
  '1john': '1JN',
  '2john': '2JN',
  '3john': '3JN',
  jude: 'JUD',
  revelation: 'REV',
}

function normalizeBookKey(book: string): string {
  return book.toLowerCase().replace(/[\s-]/g, '')
}

export function getWebBookId(book: string): string | null {
  const normalized = normalizeBookKey(book)
  return BOOK_TO_WEB_ID[normalized] ?? null
}

export async function getVerseText(
  book: string,
  chapter: string | number,
  verse: string | number
): Promise<string | null> {
  const bookId = getWebBookId(book)

  if (!bookId) {
    return null
  }

  const chapterNumber = Number(chapter)
  const verseNumber = Number(verse)

  if (!Number.isInteger(chapterNumber) || !Number.isInteger(verseNumber)) {
    return null
  }

  const url = `https://bible-api.com/data/web/${bookId}/${chapterNumber}`

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return null
    }

    const data: BibleApiChapterResponse = await response.json()

    const matchedVerse = Array.isArray(data.verses)
      ? data.verses.find((item) => Number(item.verse) === verseNumber)
      : undefined

    const text = matchedVerse?.text?.trim()

    return text || null
  } catch {
    return null
  }
}
