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

type IndexedWord = {
  raw: string
  normalized: string
  start: number
  end: number
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

function buildWordIndex(source: string): IndexedWord[] {
  const words: IndexedWord[] = []
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

function findTargetVerseRangeByFuzzyWords(
  fullText: string,
  targetVerseText: string
): Range | null {
  const fullWords = buildWordIndex(fullText)
  const targetWords = buildWordIndex(targetVerseText).map((word) => word.normalized)

  if (fullWords.length === 0 || targetWords.length === 0) return null

  const targetSet = new Set(targetWords)
  let bestStart = -1
  let bestEnd = -1
  let bestScore = 0

  for (let start = 0; start < fullWords.length; start += 1) {
    if (!targetSet.has(fullWords[start].normalized)) continue

    const seen = new Set<string>()
    let matchCount = 0

    for (let end = start; end < fullWords.length; end += 1) {
      const normalized = fullWords[end].normalized

      if (targetSet.has(normalized)) {
        if (!seen.has(normalized)) {
          seen.add(normalized)
          matchCount += 1
        }
      }

      const spanLength = end - start + 1
      const density = matchCount / spanLength
      const coverage = matchCount / Math.max(targetSet.size, 1)
      const score = coverage * 100 + density * 10

      const enoughMatches =
        matchCount >= Math.min(6, targetSet.size) &&
        coverage >= 0.45 &&
        density >= 0.45

      if (enoughMatches && score > bestScore) {
        bestScore = score
        bestStart = start
        bestEnd = end
      }

      if (spanLength > targetWords.length + 12 && density < 0.35) {
        break
      }
    }
  }

  if (bestStart === -1 || bestEnd === -1) return null

  const start = fullWords[bestStart]?.start
  const end = fullWords[bestEnd]?.end

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

  const anchorMatch = findTargetVerseRangeByAnchors(fullText, cleanedTarget)
  if (anchorMatch) {
    return anchorMatch
  }

  return findTargetVerseRangeByFuzzyWords(fullText, cleanedTarget)
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
    return 'bg-[rgba(176,132,61,0.24)] text-stone-950 ring-1 ring-[rgba(176,132,61,0.18)]'
  }

  if (kind === 'contrast') {
    return 'bg-[rgba(191,120,38,0.22)] text-stone-950 ring-1 ring-[rgba(191,120,38,0.16)]'
  }

  if (kind === 'phrase') {
    return 'bg-[rgba(196,145,73,0.19)] text-stone-950'
  }

  return 'bg-[rgba(196,145,73,0.17)] text-stone-950'
}

function targetVerseClassName() {
  return 'bg-[rgba(80,80,80,0.18)] text-stone-950 ring-1 ring-[rgba(80,80,80,0.10)]'
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
