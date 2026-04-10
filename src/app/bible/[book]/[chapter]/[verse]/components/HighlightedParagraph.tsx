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
  inTargetVerse?: boolean
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

function findTargetVerseRange(fullText: string, targetVerseText?: string): Range | null {
  const cleanedTarget = normalizeWhitespace(String(targetVerseText ?? ''))
  if (!cleanedTarget) return null

  const pattern = new RegExp(escapeRegExp(cleanedTarget), 'i')
  const match = pattern.exec(fullText)

  if (!match || typeof match.index !== 'number') return null

  return {
    start: match.index,
    end: match.index + match[0].length,
    inTargetVerse: true,
  }
}

function findNonOverlappingHighlightRanges(
  fullText: string,
  highlights: HighlightItem[]
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

      const overlaps = ranges.some(
        (range) => !(end <= range.start || start >= range.end)
      )

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
    return 'bg-[rgba(120,97,61,0.18)] text-stone-900 ring-1 ring-[rgba(120,97,61,0.16)]'
  }

  if (kind === 'contrast') {
    return 'bg-[rgba(161,98,7,0.14)] text-stone-900 ring-1 ring-[rgba(161,98,7,0.14)]'
  }

  if (kind === 'phrase') {
    return 'bg-[rgba(120,97,61,0.12)] text-stone-900'
  }

  return 'bg-[rgba(120,97,61,0.10)] text-stone-900'
}

function targetVerseClassName() {
  return 'bg-[rgba(92,70,39,0.10)] text-stone-950'
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
  const highlightRanges = findNonOverlappingHighlightRanges(fullText, cleanedHighlights)
  const segments = buildSegments(fullText, targetRange, highlightRanges)

  return (
    <p className="text-[1.02rem] leading-8 text-stone-800 whitespace-pre-wrap">
      {segments.map((segment, index) => {
        const key = `${index}-${segment.text.slice(0, 12)}`

        if (!segment.highlighted && !segment.inTargetVerse) {
          return <span key={key}>{segment.text}</span>
        }

        const classes = [
          'mx-[1px] rounded-md px-[0.22em] py-[0.08em]',
          segment.inTargetVerse ? targetVerseClassName() : '',
          segment.highlighted ? highlightClassName(segment.kind) : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <mark key={key} className={classes}>
            {segment.text}
          </mark>
        )
      })}
    </p>
  )
}
