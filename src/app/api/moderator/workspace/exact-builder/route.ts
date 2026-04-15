import { NextResponse } from 'next/server'
import { runModel } from '@/lib/ai/run-model'

type RawFrameOption = {
  title: string
  before_text: string
  after_text: string
}

type FinalOption = {
  title: string
  text: string
}

function parseRawOptions(raw: string): RawFrameOption[] | null {
  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return null

    const cleaned = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        before_text: String(item.before_text ?? '').trim(),
        after_text: String(item.after_text ?? '').trim(),
      }))
      .filter((item) => item.title && (item.before_text || item.after_text))
      .slice(0, 3)

    return cleaned.length ? cleaned : null
  } catch {
    return null
  }
}

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return raw.slice(start, end + 1)
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeLoose(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[«»"“”]/g, '')
    .trim()
    .toLowerCase()
}

function containsVerbatimSacredPassage(sacredPassage: string, candidateText: string) {
  const normalizedSacred = normalizeForCompare(sacredPassage)
  const normalizedCandidate = normalizeForCompare(candidateText)
  return normalizedCandidate.includes(normalizedSacred)
}

function assembleCardText(beforeText: string, sacredPassage: string, afterText: string) {
  const parts = [beforeText.trim(), sacredPassage.trim(), afterText.trim()].filter(Boolean)
  return parts.join(' ')
}

function countSentences(text: string) {
  const matches = text.match(/[.!?…]+/g)
  return matches ? matches.length : 1
}

function textOnlyKey(text: string) {
  return normalizeLoose(text)
}

function looksChurchyOrTheological(text: string) {
  const sample = text.toLowerCase()

  const banned = [
    'богослов',
    'доктрин',
    'догмат',
    'троиц',
    'триедин',
    'ипостас',
    'благодат',
    'священн',
    'церков',
    'конфессион',
    'православ',
    'католич',
    'протестант',
    'евангел',
    'стих учит',
    'этот стих учит',
    'это доказывает',
    'доказывает, что',
    'божествен',
    'истина о',
    'явлено',
    'открывает истину',
    'богословие',
    'теология',
    'theology',
    'doctrine',
    'dogma',
    'trinity',
    'triune',
    'hypostasis',
    'divine truth',
    'the verse teaches',
    'this proves',
  ]

  return banned.some((word) => sample.includes(word))
}

function hasEnoughExpansion(params: {
  sacredPassage: string
  beforeText: string
  afterText: string
  finalText: string
}) {
  const before = params.beforeText.trim()
  const after = params.afterText.trim()
  const finalText = params.finalText.trim()
  const sacred = params.sacredPassage.trim()

  const beforeLength = before.replace(/\s+/g, ' ').trim().length
  const afterLength = after.replace(/\s+/g, ' ').trim().length
  const nonSacredLength = beforeLength + afterLength

  const finalNormalized = normalizeForCompare(finalText)
  const sacredNormalized = normalizeForCompare(sacred)

  if (!before) return false
  if (!after) return false
  if (finalNormalized === sacredNormalized) return false
  if (beforeLength < 45) return false
  if (afterLength < 90) return false
  if (nonSacredLength < 170) return false

  const sentenceCount = countSentences(finalText)
  if (sentenceCount < 4 || sentenceCount > 7) return false

  const beforeSentences = countSentences(before)
  const afterSentences = countSentences(after)

  if (beforeSentences < 1) return false
  if (afterSentences < 2) return false

  return true
}

function isDistinctEnoughFromSacred(sacredPassage: string, finalText: string) {
  const sacredLen = sacredPassage.replace(/\s+/g, ' ').trim().length
  const finalLen = finalText.replace(/\s+/g, ' ').trim().length

  if (finalLen <= sacredLen + 100) return false
  return true
}

function dedupeAndValidateOptions(params: {
  sacredPassage: string
  options: RawFrameOption[]
}) {
  const unique: FinalOption[] = []
  const seenBody = new Set<string>()

  for (const option of params.options) {
    const finalText = assembleCardText(option.before_text, params.sacredPassage, option.after_text)

    if (!containsVerbatimSacredPassage(params.sacredPassage, finalText)) continue

    if (
      !hasEnoughExpansion({
        sacredPassage: params.sacredPassage,
        beforeText: option.before_text,
        afterText: option.after_text,
        finalText,
      })
    ) {
      continue
    }

    if (!isDistinctEnoughFromSacred(params.sacredPassage, finalText)) continue
    if (looksChurchyOrTheological(`${option.title} ${finalText}`)) continue

    const bodyKey = textOnlyKey(finalText)

    if (seenBody.has(bodyKey)) continue
    seenBody.add(bodyKey)

    unique.push({
      title: option.title,
      text: finalText,
    })
  }

  return unique
}

function buildPrompt(params: {
  reference: string
  verseText: string
  sacredPassage: string
  mode: 'fresh' | 'more'
}) {
  const variationInstruction =
    params.mode === 'more'
      ? `
Generate 3 NEW options that are noticeably different from a previous batch.
They must differ not only in title, but in the actual development of the same core idea.
Do not return the same card body under different titles.
`
      : `
Generate 3 strong initial options.
They must already feel save-worthy, not rough notes.
Do not return 3 copies of the same card with renamed headings.
`

  return `
You are an elite editor of short Russian Bible insight cards for Scriptura+.

REFERENCE:
${params.reference}

VERSE TEXT:
${params.verseText}

SACRED PASSAGE:
${params.sacredPassage}

TASK:
Generate 3 strong Russian insight-card options around the sacred passage.

CRITICAL CORE RULE:
The sacred passage is untouchable and must remain exactly as given.
It will be inserted later by the server word-for-word.
You must NOT rewrite it.
You must NOT paraphrase it.
You must NOT include it inside before_text or after_text.

You are only generating:
- a short strong Russian title
- before_text: analytical framing before the sacred passage
- after_text: analytical continuation after the sacred passage

BUT VERY IMPORTANT:
These are not cosmetic wrappers.
Each option must feel like a real, complete, save-worthy card.
The sacred passage is only the core.
You must build real thought around it.

MANDATORY SHAPE OF EACH OPTION:
- before_text must be present
- after_text must be present
- before_text must contain at least 1 strong sentence
- after_text must contain at least 2 strong sentences
- the final assembled card must read like one developed card, not a pasted fragment

EXPANSION REQUIREMENT:
- before_text must add meaningful framing, not filler
- after_text must continue and deepen the thought
- the final assembled card must contain 4-7 sentences in total once the sacred passage is inserted
- the final card must feel developed, not like the sacred passage plus one weak sentence
- do NOT produce a card that is basically the sacred passage repeated under a new title

SAME ANGLE, DIFFERENT PACKAGING:
All 3 options must preserve the same central insight.
Do not change the angle.
Do not go into neighboring ideas.
But do package the same insight differently:
- one option may stress the rhetorical force
- another the conceptual consequence
- another the structural pressure of the wording
All 3 must still belong to the same thought-center.

VERY IMPORTANT DIVERSITY RULE:
The 3 final cards must be materially different from each other.
Different title alone is NOT enough.
If two options would produce almost the same final card text, rewrite one of them.
Do not return duplicate bodies with renamed headings.

ANTI-THEOLOGY / ANTI-CHURCH FILTER:
This product must sound like a modern analytical AI reading tool for people from many religions and backgrounds.
Therefore:
- do not use church language
- do not use confessional language
- do not use sermon language
- do not use devotional language
- do not use doctrinal or theological jargon
- do not make dogmatic claims
- do not turn the wording into a creed
- do not sound like a preacher, priest, commentator, apologist, or catechist

FORBIDDEN VOCABULARY / TONE:
Avoid words and phrases equivalent to:
- богословие
- доктрина
- догмат
- троица
- триединый
- ипостась
- благодать in church-jargon tone
- священная тайна
- стих учит
- это доказывает
- явлено здесь
- divine truth
- theology
- doctrine
- dogma
- trinity
- triune
- hypostasis
- the verse teaches
- this proves

LANGUAGE STANDARD:
Write in modern, neutral, analytical Russian.
The tone must be:
- clear
- precise
- contemporary
- intellectually serious
- compact but rich
- non-preachy
- non-churchy
- non-academic-jargon-heavy
- elegant without sounding theatrical

QUALITY GOAL:
Each option should feel like a ready short comment card:
- compact
- clear
- elegant
- thoughtful
- save-worthy
- analytically honest
- based on the wording of the verse
- not bloated
- not generic
- not moralizing

STRUCTURAL GOAL:
The final assembled card should read like:
- strong framing
- sacred core
- meaningful continuation
not like:
- title
- same inserted text
- nothing else

${variationInstruction}

OUTPUT RULES:
- Return ONLY valid JSON
- No markdown
- No code fences
- No commentary outside JSON
- Output must be a JSON array of exactly 3 objects
- Each object must have:
  - "title": short strong Russian title
  - "before_text": 1-2 strong Russian sentences before the sacred passage
  - "after_text": 2-4 strong Russian sentences after the sacred passage
- Do not include the sacred passage itself in either field

FORMAT:
[
  {
    "title": "...",
    "before_text": "...",
    "after_text": "..."
  }
]
`.trim()
}

async function generateOptions(params: {
  reference: string
  verseText: string
  sacredPassage: string
  mode: 'fresh' | 'more'
}) {
  const prompt = buildPrompt(params)

  const result = await runModel({
    prompt,
    model: 'gpt-5.4-mini',
    maxOutputTokens: 2600,
  })

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error || 'Model request failed.',
      raw: result.raw || '',
      options: null,
    }
  }

  const rawText = result.rawText
  let rawOptions = parseRawOptions(rawText)

  if (!rawOptions) {
    const extracted = extractJsonArray(rawText)
    if (extracted) {
      rawOptions = parseRawOptions(extracted)
    }
  }

  if (!rawOptions) {
    return {
      ok: false as const,
      error: 'Failed to parse exact builder options.',
      raw: rawText || 'Empty model response',
      options: null,
    }
  }

  const strictOptions = dedupeAndValidateOptions({
    sacredPassage: params.sacredPassage,
    options: rawOptions,
  })

  if (strictOptions.length < 3) {
    return {
      ok: false as const,
      error:
        'Model did not produce 3 sufficiently developed and materially different cards around the sacred passage.',
      raw: rawText || '',
      options: null,
    }
  }

  return {
    ok: true as const,
    error: '',
    raw: rawText || '',
    options: strictOptions.slice(0, 3),
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const reference = String(body.reference ?? '').trim()
    const verseText = String(body.verseText ?? '').trim()
    const sacredPassage = String(body.sacredPassage ?? '').trim()
    const mode = body.mode === 'more' ? 'more' : 'fresh'

    if (!reference || !verseText || !sacredPassage) {
      return NextResponse.json(
        { error: 'reference, verseText, and sacredPassage are required.' },
        { status: 400 }
      )
    }

    const firstPass = await generateOptions({
      reference,
      verseText,
      sacredPassage,
      mode,
    })

    if (firstPass.ok && firstPass.options && firstPass.options.length >= 3) {
      return NextResponse.json({ options: firstPass.options.slice(0, 3) })
    }

    const retryPass = await generateOptions({
      reference,
      verseText,
      sacredPassage,
      mode,
    })

    if (retryPass.ok && retryPass.options && retryPass.options.length >= 3) {
      return NextResponse.json({ options: retryPass.options.slice(0, 3) })
    }

    return NextResponse.json(
      {
        error:
          retryPass.error || firstPass.error || 'Failed to generate exact builder options.',
        raw: retryPass.raw || firstPass.raw || '',
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Exact builder API error:', error)

    return NextResponse.json(
      { error: 'Something went wrong while generating exact builder options.' },
      { status: 500 }
    )
  }
}
