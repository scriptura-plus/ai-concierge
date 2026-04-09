import { runModel } from '@/lib/ai/run-model'
import { getWebBookId } from '@/lib/bible/getVerseText'

type BibleApiVerse = {
  verse?: number
  text?: string
}

type BibleApiChapterResponse = {
  verses?: BibleApiVerse[]
}

export type ParagraphDirectionality =
  | 'backward-dependent'
  | 'forward-dependent'
  | 'two-sided'
  | 'self-contained'

export type ParagraphSelection = {
  directionality: ParagraphDirectionality
  startVerse: number
  endVerse: number
  reason: string
}

export type ParagraphTextResult = {
  selection: ParagraphSelection
  paragraph: {
    reference: string
    text: string
  }
  chapterVerses: Array<{
    verse: number
    text: string
  }>
}

type SelectorModelResponse = {
  directionality?: ParagraphDirectionality
  startVerse?: number
  endVerse?: number
  reason?: string
}

const WORKING_RADIUS = 4
const HARD_MAX_TOTAL_VERSES = 8

function normalizeVerseText(text: string | undefined): string {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactVerses(
  verses: BibleApiVerse[] | undefined
): Array<{ verse: number; text: string }> {
  if (!Array.isArray(verses)) return []

  return verses
    .map((item) => ({
      verse: Number(item.verse),
      text: normalizeVerseText(item.text),
    }))
    .filter((item) => Number.isInteger(item.verse) && item.verse > 0 && item.text.length > 0)
}

function buildRangeReference(book: string, chapter: number, startVerse: number, endVerse: number): string {
  const prettyBook = book
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')

  if (startVerse === endVerse) {
    return `${prettyBook} ${chapter}:${startVerse}`
  }

  return `${prettyBook} ${chapter}:${startVerse}-${endVerse}`
}

function buildParagraphText(
  verses: Array<{ verse: number; text: string }>,
  startVerse: number,
  endVerse: number
): string {
  return verses
    .filter((item) => item.verse >= startVerse && item.verse <= endVerse)
    .map((item) => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSelectorJson(rawText: string): SelectorModelResponse | null {
  try {
    const parsed = JSON.parse(rawText) as SelectorModelResponse
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    const start = rawText.indexOf('{')
    const end = rawText.lastIndexOf('}')

    if (start === -1 || end === -1 || end <= start) return null

    try {
      const parsed = JSON.parse(rawText.slice(start, end + 1)) as SelectorModelResponse
      if (!parsed || typeof parsed !== 'object') return null
      return parsed
    } catch {
      return null
    }
  }
}

function buildFallbackSelection(
  availableVerses: number[],
  targetVerse: number
): ParagraphSelection {
  const minVerse = Math.min(...availableVerses)
  const maxVerse = Math.max(...availableVerses)

  const prevExists = availableVerses.includes(targetVerse - 1)
  const nextExists = availableVerses.includes(targetVerse + 1)

  if (prevExists && nextExists) {
    return {
      directionality: 'two-sided',
      startVerse: Math.max(minVerse, targetVerse - 1),
      endVerse: Math.min(maxVerse, targetVerse + 1),
      reason:
        'Fallback selection: the verse appears to sit inside a short local unit, so one verse on each side was included.',
    }
  }

  if (prevExists) {
    return {
      directionality: 'backward-dependent',
      startVerse: Math.max(minVerse, targetVerse - 1),
      endVerse: targetVerse,
      reason:
        'Fallback selection: the verse appears to depend more on what comes immediately before it.',
    }
  }

  if (nextExists) {
    return {
      directionality: 'forward-dependent',
      startVerse: targetVerse,
      endVerse: Math.min(maxVerse, targetVerse + 1),
      reason:
        'Fallback selection: the verse appears to open into what follows, so one following verse was included.',
    }
  }

  return {
    directionality: 'self-contained',
    startVerse: targetVerse,
    endVerse: targetVerse,
    reason:
      'Fallback selection: no stronger local dependence was safely detected, so the verse remains self-contained.',
  }
}

function clampSelectionToWindow(
  parsed: SelectorModelResponse,
  availableVerses: number[],
  targetVerse: number
): ParagraphSelection | null {
  const minVerse = Math.min(...availableVerses)
  const maxVerse = Math.max(...availableVerses)

  const startVerse = Number(parsed.startVerse)
  const endVerse = Number(parsed.endVerse)

  if (!Number.isInteger(startVerse) || !Number.isInteger(endVerse)) {
    return null
  }

  if (startVerse > targetVerse || endVerse < targetVerse) {
    return null
  }

  if (startVerse < minVerse || endVerse > maxVerse) {
    return null
  }

  if (endVerse - startVerse + 1 > HARD_MAX_TOTAL_VERSES) {
    return null
  }

  const directionality = parsed.directionality
  const safeDirectionality: ParagraphDirectionality =
    directionality === 'backward-dependent' ||
    directionality === 'forward-dependent' ||
    directionality === 'two-sided' ||
    directionality === 'self-contained'
      ? directionality
      : 'self-contained'

  return {
    directionality: safeDirectionality,
    startVerse,
    endVerse,
    reason:
      typeof parsed.reason === 'string' && parsed.reason.trim()
        ? parsed.reason.trim()
        : 'Model-selected minimal reading block.',
  }
}

function buildSelectorPrompt(params: {
  book: string
  chapter: number
  targetVerse: number
  verseText: string
  workingWindow: Array<{ verse: number; text: string }>
}) {
  const windowText = params.workingWindow
    .map((item) => `${item.verse}. ${item.text}`)
    .join('\n')

  return `
You are selecting the smallest meaningful reading block around a target Bible verse.

IMPORTANT:
You are NOT writing commentary.
You are NOT explaining the verse.
You are ONLY selecting the minimal reading unit that best contains the target verse.

Your goal:
Choose the smallest meaningful block inside the provided local window that makes the target verse read naturally and intelligently.

Allowed directionality values:
- backward-dependent
- forward-dependent
- two-sided
- self-contained

Definitions:
- backward-dependent = the verse mainly depends on what comes before
- forward-dependent = the verse mainly opens into what comes after
- two-sided = the verse belongs to a small unit that needs both sides
- self-contained = the verse is mostly complete on its own

STRICT RULES:
- The target verse must be included.
- Choose the smallest meaningful block.
- Do not expand just because more surrounding verses exist.
- Do not exceed the provided local window.
- Prefer reading coherence, scene coherence, argument coherence, or prayer-speech coherence.
- If there is no strong larger unit, keep the block short.
- Never return more than 8 total verses.
- Be conservative.

BOOK:
${params.book}

CHAPTER:
${params.chapter}

TARGET VERSE:
${params.targetVerse}

TARGET VERSE TEXT:
${params.verseText}

LOCAL WINDOW:
${windowText}

Return ONLY valid JSON in this exact shape:
{
  "directionality": "backward-dependent | forward-dependent | two-sided | self-contained",
  "startVerse": number,
  "endVerse": number,
  "reason": "short explanation"
}
`.trim()
}

async function fetchChapterVerses(
  book: string,
  chapter: number
): Promise<Array<{ verse: number; text: string }> | null> {
  const bookId = getWebBookId(book)

  if (!bookId) {
    return null
  }

  const url = `https://bible-api.com/data/web/${bookId}/${chapter}`

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return null
    }

    const data: BibleApiChapterResponse = await response.json()
    const verses = compactVerses(data.verses)

    return verses.length > 0 ? verses : null
  } catch {
    return null
  }
}

export async function getParagraphText(
  book: string,
  chapter: string | number,
  verse: string | number
): Promise<ParagraphTextResult | null> {
  const chapterNumber = Number(chapter)
  const verseNumber = Number(verse)

  if (!Number.isInteger(chapterNumber) || !Number.isInteger(verseNumber)) {
    return null
  }

  const chapterVerses = await fetchChapterVerses(book, chapterNumber)

  if (!chapterVerses) {
    return null
  }

  const target = chapterVerses.find((item) => item.verse === verseNumber)

  if (!target) {
    return null
  }

  const windowStart = Math.max(1, verseNumber - WORKING_RADIUS)
  const windowEnd = verseNumber + WORKING_RADIUS

  const workingWindow = chapterVerses.filter(
    (item) => item.verse >= windowStart && item.verse <= windowEnd
  )

  if (workingWindow.length === 0) {
    return null
  }

  const prompt = buildSelectorPrompt({
    book,
    chapter: chapterNumber,
    targetVerse: verseNumber,
    verseText: target.text,
    workingWindow,
  })

  let selection: ParagraphSelection | null = null

  try {
    const result = await runModel({
      prompt,
      model: 'gpt-5.4-mini',
      maxOutputTokens: 500,
    })

    if (result.ok && result.rawText) {
      const parsed = parseSelectorJson(result.rawText)
      if (parsed) {
        selection = clampSelectionToWindow(
          parsed,
          workingWindow.map((item) => item.verse),
          verseNumber
        )
      }
    }
  } catch {
    // ignore and fall back
  }

  if (!selection) {
    selection = buildFallbackSelection(
      workingWindow.map((item) => item.verse),
      verseNumber
    )
  }

  const paragraphText = buildParagraphText(
    chapterVerses,
    selection.startVerse,
    selection.endVerse
  )

  if (!paragraphText) {
    return null
  }

  return {
    selection,
    paragraph: {
      reference: buildRangeReference(book, chapterNumber, selection.startVerse, selection.endVerse),
      text: paragraphText,
    },
    chapterVerses,
  }
}
