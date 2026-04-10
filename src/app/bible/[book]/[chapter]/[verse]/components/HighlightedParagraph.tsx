type HighlightKind = 'keyword' | 'phrase' | 'contrast' | 'pivot'

type HighlightItem = {
  text: string
  kind: HighlightKind
}

type HighlightedParagraphProps = {
  text: string
  highlights: HighlightItem[]
  targetVerseText?: string
}

export default function HighlightedParagraph({
  text,
}: HighlightedParagraphProps) {
  const fullText = String(text ?? '')

  if (!fullText.trim()) {
    return null
  }

  return (
    <p className="text-[1.02rem] leading-8 text-stone-800 whitespace-pre-wrap">
      {fullText}
    </p>
  )
}
