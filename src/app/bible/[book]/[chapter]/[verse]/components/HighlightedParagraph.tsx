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

function normalizeForLooseMatch(value: string) {
  return normalizeWhitespace(value)
    .replace(/[“”‘’"]/g, "'")
    .replace(/\s*([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .toLowerCase()
}

function buildNormalizedTextMap(source: string) {
  let normalized = ''
  const map: number[] = []

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    const lower = ch.toLowerCase()

    const normalizedChar =
      ch === '“' || ch === '”' || ch === '‘' || ch === '’' || ch === '"'
        ? "'"
        : /\s/.test(ch)
          ? ' '
          : lower

    if (normalizedChar === ' ') {
      const prev = normalized[normalized.length - 1]
      if (!normalized.length || prev === ' ' || /[,.;:!?]/.test(prev)) {
        continue
      }
    }

    if (/[,.;:!?]/.test(normalizedChar)) {
      if (normalized.endsWith(' ')) {
        normalized = normalized.slice(0, -1)
        map.pop()
      }
    }

    normalized += normalizedChar
    map.push(i)
  }

  normalized = normalized.trim()
  while (map.length > normalized.length) {
    map.pop()
  }

  return { normalized, map }
}

function findTargetVerseRange(fullText: string, targetVerseText?: string): Range | null {
  const cleanedTarget = normalizeForLooseMatch(String(targetVerseText ?? ''))
  if (!cleanedTarget) return null

  const { normalized, map } = buildNormalizedTextMap(fullText)
  const startInNormalized = normalized.indexOf(cleanedTarget)

  if (startInNormalized === -1) return null

  const endInNormalized = startInNormalized + cleanedTarget.length - 1
  const start = map[startInNormalized]
  const end = map[endInNormalized]

  if (typeof start !== 'number' || typeof end !== 'number') return null

  return {
    start,
    end: end + 1,
  }
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return !(aEnd <= bStart || aStart >= bEnd)
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
    const matches = Array.from(fullText.matchAll(pattern))

    for (const match of matches) {
      const start = match.index
      const matchedText = match[0]

      if (typeof start !== 'number' || !matchedText) continue

      const end = start + matchedText.length

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
