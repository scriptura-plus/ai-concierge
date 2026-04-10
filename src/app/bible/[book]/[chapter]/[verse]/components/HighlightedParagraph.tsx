type HighlightKind = 'keyword' | 'phrase' | 'contrast' | 'pivot'

type HighlightItem = {
  text: string
  kind: HighlightKind
}

type Segment = {
  text: string
  highlighted: boolean
  inTargetVerse: boolean
  kind?: HighlightKind
}

type Range = {
  start: number
  end: number
  kind?: HighlightKind
}

type HighlightedParagraphProps = {
  text: string
  highlights: HighlightItem[]
  targetVerseText?: string
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeWordForAnchor(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”‘’"'`´]/g, '')
    .replace(/[^a-zа-яё0-9]+/gi, '')
    .trim()
}

function buildWordIndex(source: string) {
  const words: Array<{ raw: string; normalized: string; start: number; end: number }> = []
  const regex = /[^\s]+/g
  let match: RegExpExecArray | null = regex.exec(source)

  while (match) {
    const raw = match[0]
    const start = match.index

    if (typeof start === 'number') {
      const normalized = normalizeWordForAnchor(raw)

      if (normalized) {
        words.push({
          raw,
          normalized,
          start,
          end: start + raw.length,
        })
      }
    }

    match = regex.exec(source)
  }

  return words
}

function buildAnchorPhrases(targetVerseText: string) {
  const words = normalizeWhitespace(targetVerseText)
    .split(' ')
    .map(normalizeWordForAnchor)
    .filter(Boolean)

  if (words.length === 0) {
    return null
  }

  const anchorSize = Math.min(5, Math.max(3, Math.floor(words.length / 3)))

  const startAnchor = words.slice(0, anchorSize)
  const endAnchor = words.slice(-anchorSize)

  return {
    startAnchor,
    endAnchor,
  }
}

function findSequenceIndex(
  fullWords: Array<{ normalized: string }>,
  anchor: string[],
  fromLeft = true
) {
  if (anchor.length === 0 || fullWords.length < anchor.length) return -1

  if (fromLeft) {
    for (let i = 0; i <= fullWords.length - anchor.length; i += 1) {
      let ok = true

      for (let j = 0; j < anchor.length; j += 1) {
        if (fullWords[i + j].normalized !== anchor[j]) {
          ok = false
          break
        }
      }

      if (ok) return i
    }

    return -1
  }

  for (let i = fullWords.length - anchor.length; i >= 0; i -= 1) {
    let ok = true

    for (let j = 0; j < anchor.length; j += 1) {
      if (fullWords[i + j].normalized !== anchor[j]) {
        ok = false
        break
      }
    }

    if (ok) return i
  }

  return -1
}

function buildNormalizedCharMap(source: string) {
  let normalized = ''
  const map: number[] = []

  for (let i = 0; i < source.length; i += 1) {
    const normalizedChar = normalizeWordForAnchor(source[i])

    if (!normalizedChar) continue

    normalized += normalizedChar
    map.push(i)
  }

  return { normalized, map }
}

function findTargetVerseRangeByNormalizedString(
  fullText: string,
  targetVerseText: string
): Range | null {
  const full = buildNormalizedCharMap(fullText)
  const target = buildNormalizedCharMap(targetVerseText)

  if (!full.normalized || !target.normalized) return null

  const startInNormalized = full.normalized.indexOf(target.normalized)
  if (startInNormalized === -1) return null

  const endInNormalized = startInNormalized + target.normalized.length - 1

  const start = full.map[startInNormalized]
  const endCharIndex = full.map[endInNormalized]

  if (typeof start !== 'number' || typeof endCharIndex !== 'number') return null

  return {
    start,
    end: endCharIndex + 1,
  }
}

function findTargetVerseRangeByAnchors(fullText: string, targetVerseText: string): Range | null {
  const anchors = buildAnchorPhrases(targetVerseText)
  if (!anchors) return null

  const fullWords = buildWordIndex(fullText)
  if (fullWords.length === 0) return null

  const startIndex = findSequenceIndex(fullWords, anchors.startAnchor, true)
  const endIndexStart = findSequenceIndex(fullWords, anchors.endAnchor, false)

  if (startIndex === -1 || endIndexStart === -1) return null

  const endIndex = endIndexStart + anchors.endAnchor.length - 1

  if (endIndex < startIndex) return null

  const start = fullWords[startIndex]?.start
  const end = fullWords[endIndex]?.end

  if (typeof start !== 'number' || typeof end !== 'number') return null

  return { start, end }
}

function findTargetVerseRange(fullText: string, targetVerseText?: string): Range | null {
  const cleanedTarget = normalizeWhitespace(String(targetVerseText ?? ''))
  if (!cleanedTarget) return null

  const exactNormalizedMatch = findTargetVerseRangeByNormalizedString(fullText, cleanedTarget)
  if (exactNormalizedMatch) {
    return exactNormalizedMatch
  }

  return findTargetVerseRangeByAnchors(fullText, cleanedTarget)
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return !(aEnd <= bStart || aStart >= bEnd)
}

function findAllRegexMatches(source: string, regex: RegExp) {
  const matches: Array<{ start: number; text: string }> = []
  let match: RegExpExecArray | null = regex.exec(source)

  while (match) {
    if (typeof match.index === 'number' && match[0]) {
      matches.push({
        start: match.index,
        text: match[0],
      })
    }

    if (match[0] === '') {
      regex.lastIndex += 1
    }

    match = regex.exec(source)
  }

  return matches
}

function findNonOverlappingHighlightRanges(
  fullText: string,
  highlights: HighlightItem[],
  targetRange: Range | null
): Array<{ start: number; end: number; kind: HighlightKind }> {
  const ranges: Array<{ start: number; end: number; kind: HighlightKind }> = []

  const sortedHighlights = [...highlights]
    .map((item) => ({
      text: normalizeWhitespace(String(item.text ?? '')),
      kind: item.kind,
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => b.text.length - a.text.length)

  for (const item of sortedHighlights) {
    const pattern = new RegExp(escapeRegExp(item.text), 'gi')
    const matches = findAllRegexMatches(fullText, pattern)

    for (const match of matches) {
      const start = match.start
      const end = start + match.text.length

      if (targetRange && rangesOverlap(start, end, targetRange.start, targetRange.end)) {
        continue
      }

      const overlaps = ranges.some((range) => rangesOverlap(start, end, range.start, range.end))

      if (overlaps) continue

      ranges.push({
        start,
        end,
        kind: item.kind,
      })

      break
    }
  }

  return ranges.sort((a, b) => a.start - b.start)
}

function buildSegments(
  fullText: string,
  targetRange: Range | null,
  highlightRanges: Array<{ start: number; end: number; kind: HighlightKind }>
): Segment[] {
  const boundaries = new Set<number>([0, fullText.length])

  if (targetRange) {
    boundaries.add(targetRange.start)
    boundaries.add(targetRange.end)
  }

  for (const range of highlightRanges) {
    boundaries.add(range.start)
    boundaries.add(range.end)
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  const segments: Segment[] = []

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i]
    const end = sorted[i + 1]

    if (end <= start) continue

    const text = fullText.slice(start, end)
    if (!text) continue

    const highlight = highlightRanges.find(
      (range) => start >= range.start && end <= range.end
    )

    const inTargetVerse =
      !!targetRange && start >= targetRange.start && end <= targetRange.end

    segments.push({
      text,
      highlighted: !!highlight,
      inTargetVerse,
      kind: highlight?.kind,
    })
  }

  return segments
}

function highlightClassName(kind?: HighlightKind) {
  if (kind === 'pivot') {
    return 'bg-[rgba(176,132,61,0.22)] text-stone-950 ring-1 ring-[rgba(176,132,61,0.18)]'
  }

  if (kind === 'contrast') {
    return 'bg-[rgba(191,120,38,0.20)] text-stone-950 ring-1 ring-[rgba(191,120,38,0.16)]'
  }

  if (kind === 'phrase') {
    return 'bg-[rgba(196,145,73,0.18)] text-stone-950'
  }

  return 'bg-[rgba(196,145,73,0.16)] text-stone-950'
}

function targetVerseClassName() {
  return 'bg-[rgba(92,70,39,0.14)] text-stone-950'
}

export default function HighlightedParagraph({
  text,
  highlights,
  targetVerseText,
}: HighlightedParagraphProps) {
  const fullText = String(text ?? '')
  const cleanedHighlights = Array.isArray(highlights) ? highlights : []

  if (!fullText.trim()) {
    return null
  }

  const targetRange = findTargetVerseRange(fullText, targetVerseText)
  const highlightRanges = findNonOverlappingHighlightRanges(
    fullText,
    cleanedHighlights,
    targetRange
  )
  const segments = buildSegments(fullText, targetRange, highlightRanges)

  return (
    <p className="text-[1.02rem] leading-8 text-stone-800 whitespace-pre-wrap">
      {segments.map((segment, index) => {
        const key = `${index}-${segment.text.slice(0, 12)}`

        if (!segment.highlighted && !segment.inTargetVerse) {
          return <span key={key}>{segment.text}</span>
        }

        if (segment.inTargetVerse) {
          return (
            <mark
              key={key}
              className={`mx-[1px] rounded-md px-[0.22em] py-[0.08em] ${targetVerseClassName()}`}
            >
              {segment.text}
            </mark>
          )
        }

        return (
          <mark
            key={key}
            className={`mx-[1px] rounded-md px-[0.22em] py-[0.08em] ${highlightClassName(
              segment.kind
            )}`}
          >
            {segment.text}
          </mark>
        )
      })}
    </p>
  )
}
