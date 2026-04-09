type HighlightKind = 'keyword' | 'phrase' | 'contrast' | 'pivot'

type HighlightItem = {
  text: string
  kind: HighlightKind
}

type Segment = {
  text: string
  highlighted: boolean
  kind?: HighlightKind
}

type HighlightedParagraphProps = {
  text: string
  highlights: HighlightItem[]
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findNonOverlappingRanges(
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
    const matches = [...fullText.matchAll(pattern)]

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
  ranges: Array<{ start: number; end: number; kind: HighlightKind }>
): Segment[] {
  if (ranges.length === 0) {
    return [{ text: fullText, highlighted: false }]
  }

  const segments: Segment[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({
        text: fullText.slice(cursor, range.start),
        highlighted: false,
      })
    }

    segments.push({
      text: fullText.slice(range.start, range.end),
      highlighted: true,
      kind: range.kind,
    })

    cursor = range.end
  }

  if (cursor < fullText.length) {
    segments.push({
      text: fullText.slice(cursor),
      highlighted: false,
    })
  }

  return segments.filter((segment) => segment.text.length > 0)
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

export default function HighlightedParagraph({
  text,
  highlights,
}: HighlightedParagraphProps) {
  const fullText = String(text ?? '')
  const cleanedHighlights = Array.isArray(highlights) ? highlights : []

  if (!fullText.trim()) {
    return null
  }

  const ranges = findNonOverlappingRanges(fullText, cleanedHighlights)
  const segments = buildSegments(fullText, ranges)

  return (
    <p className="text-[1.02rem] leading-8 text-stone-800 whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (!segment.highlighted) {
          return <span key={`${index}-${segment.text.slice(0, 12)}`}>{segment.text}</span>
        }

        return (
          <mark
            key={`${index}-${segment.text.slice(0, 12)}`}
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
