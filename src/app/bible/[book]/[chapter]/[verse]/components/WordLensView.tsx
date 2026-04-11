'use client'

type WordLensNodeKind =
  | 'word'
  | 'phrase'
  | 'formula'
  | 'idiom'
  | 'image'
  | 'contrast'

type WordLensNode = {
  id: string
  kind: WordLensNodeKind
  label: string
  original: string
  transliteration?: string
  semantic_core: string
  why_it_matters: string
  dig_deeper: string
}

type WordLensPayload = {
  lead: string
  nodes: WordLensNode[]
}

type LocaleCode = 'en' | 'ru' | 'es' | 'fr' | 'de'

type WordLensViewProps = {
  isReady: boolean
  isLoading: boolean
  error: string
  data: WordLensPayload | null
  title: string
  leadFallback: string
  takeawayFallback: string
  pointLabel: string
  takeawayLabel: string
  loadingLabel: string
  loadingText: string
  unavailableLabel: string
  tryAgainLabel: string
  changeLabel: string
  copyLabel: string
  copiedLabel: string
  copyFailedLabel: string
  shareLabel: string
  shareStatus: string
  copyStatus: 'idle' | 'copied' | 'failed'
  customPromptValue: string
  onCustomPromptChange: (value: string) => void
  onRetry: () => void
  onChangeMode: () => void
  onCopy: () => void
  onShare: () => void
  onNodeSelect: (nodeId: string) => void
  onCustomDig: () => void
}

const UI_COPY: Record<
  LocaleCode,
  {
    intro1: string
    intro2: string
    intro3: string
    keyReading: string
    keyShift: string
    whyItOpensMap: string
    wordMap: string
    semanticCore: string
    whyThisMatters: string
    digDeeper: string
    yourDiggingDirection: string
    customPlaceholder: string
    customButton: string
    word: string
    phrase: string
    formula: string
    idiom: string
    image: string
    contrast: string
  }
> = {
  en: {
    intro1:
      'This lens builds a map of the strongest meaning-nodes inside the wording of the verse.',
    intro2:
      'The goal is not generic commentary, but lexical entrances that genuinely open the text.',
    intro3:
      'Each node should feel like a promising path: semantic weight, idiom, formula, image, or contrast.',
    keyReading: 'Key reading',
    keyShift: 'Meaning shift',
    whyItOpensMap: 'Why this opens the map',
    wordMap: 'Word map',
    semanticCore: 'Semantic core',
    whyThisMatters: 'Why this matters',
    digDeeper: 'Dig deeper',
    yourDiggingDirection: 'Your own digging direction',
    customPlaceholder: 'Describe what exactly you want to dig into in this verse...',
    customButton: 'Dig into this direction',
    word: 'Word',
    phrase: 'Phrase',
    formula: 'Formula',
    idiom: 'Idiom',
    image: 'Image',
    contrast: 'Contrast',
  },
  ru: {
    intro1:
      'Эта линза строит карту самых сильных смысловых узлов внутри самого текста стиха.',
    intro2:
      'Задача здесь не в общем комментарии, а в языковых входах, которые реально раскрывают стих.',
    intro3:
      'Каждый узел должен ощущаться как настоящее направление: слово, формула, идиома, образ или контраст.',
    keyReading: 'Ключ чтения',
    keyShift: 'Смысловой сдвиг',
    whyItOpensMap: 'Почему отсюда открывается карта',
    wordMap: 'Карта слов',
    semanticCore: 'Смысловое ядро',
    whyThisMatters: 'Почему это важно',
    digDeeper: 'Куда копать дальше',
    yourDiggingDirection: 'Своё направление поиска',
    customPlaceholder: 'Опиши, что именно ты хочешь раскопать в этом стихе...',
    customButton: 'Копать в эту сторону',
    word: 'Слово',
    phrase: 'Фраза',
    formula: 'Формула',
    idiom: 'Идиома',
    image: 'Образ',
    contrast: 'Контраст',
  },
  es: {
    intro1:
      'Esta lente construye un mapa de los nodos de sentido más fuertes dentro de la redacción del versículo.',
    intro2:
      'La meta no es un comentario genérico, sino entradas léxicas que realmente abran el texto.',
    intro3:
      'Cada nodo debe sentirse como un camino prometedor: peso semántico, modismo, fórmula, imagen o contraste.',
    keyReading: 'Clave de lectura',
    keyShift: 'Desplazamiento de sentido',
    whyItOpensMap: 'Por qué esto abre el mapa',
    wordMap: 'Mapa de palabras',
    semanticCore: 'Núcleo semántico',
    whyThisMatters: 'Por qué importa',
    digDeeper: 'Profundizar',
    yourDiggingDirection: 'Tu propia dirección de búsqueda',
    customPlaceholder: 'Describe exactamente qué quieres explorar en este versículo...',
    customButton: 'Explorar esta dirección',
    word: 'Palabra',
    phrase: 'Frase',
    formula: 'Fórmula',
    idiom: 'Modismo',
    image: 'Imagen',
    contrast: 'Contraste',
  },
  fr: {
    intro1:
      'Cette lentille construit une carte des nœuds de sens les plus forts dans la formulation du verset.',
    intro2:
      'Le but n’est pas un commentaire générique, mais des entrées lexicales qui ouvrent réellement le texte.',
    intro3:
      'Chaque nœud doit ressembler à une vraie piste: poids sémantique, idiome, formule, image ou contraste.',
    keyReading: 'Clé de lecture',
    keyShift: 'Déplacement de sens',
    whyItOpensMap: 'Pourquoi cela ouvre la carte',
    wordMap: 'Carte des mots',
    semanticCore: 'Noyau sémantique',
    whyThisMatters: 'Pourquoi cela compte',
    digDeeper: 'Creuser plus loin',
    yourDiggingDirection: 'Votre propre direction de recherche',
    customPlaceholder: 'Décrivez exactement ce que vous voulez creuser dans ce verset...',
    customButton: 'Creuser dans cette direction',
    word: 'Mot',
    phrase: 'Expression',
    formula: 'Formule',
    idiom: 'Idiome',
    image: 'Image',
    contrast: 'Contraste',
  },
  de: {
    intro1:
      'Diese Linse baut eine Karte der stärksten Bedeutungs-Knoten in der Formulierung des Verses.',
    intro2:
      'Das Ziel ist kein allgemeiner Kommentar, sondern lexikalische Zugänge, die den Text wirklich öffnen.',
    intro3:
      'Jeder Knoten soll wie ein echter Zugang wirken: semantisches Gewicht, Idiom, Formel, Bild oder Kontrast.',
    keyReading: 'Leseschlüssel',
    keyShift: 'Bedeutungsverschiebung',
    whyItOpensMap: 'Warum sich von hier die Karte öffnet',
    wordMap: 'Wortkarte',
    semanticCore: 'Semantischer Kern',
    whyThisMatters: 'Warum das wichtig ist',
    digDeeper: 'Weiter graben',
    yourDiggingDirection: 'Eigene Suchrichtung',
    customPlaceholder: 'Beschreibe genau, worin du in diesem Vers tiefer graben willst...',
    customButton: 'In diese Richtung graben',
    word: 'Wort',
    phrase: 'Phrase',
    formula: 'Formel',
    idiom: 'Idiom',
    image: 'Bild',
    contrast: 'Kontrast',
  },
}

function detectLocale(changeLabel: string, title: string): LocaleCode {
  const source = `${changeLabel} ${title}`.toLowerCase()

  if (/[а-яё]/i.test(source)) return 'ru'
  if (
    source.includes('cambiar') ||
    source.includes('lente') ||
    source.includes('palabra')
  ) {
    return 'es'
  }
  if (
    source.includes('changer') ||
    source.includes('lentille') ||
    source.includes('mot')
  ) {
    return 'fr'
  }
  if (
    source.includes('ändern') ||
    source.includes('linse') ||
    source.includes('wort')
  ) {
    return 'de'
  }

  return 'en'
}

function kindBadge(kind: WordLensNodeKind, locale: LocaleCode) {
  const t = UI_COPY[locale]

  if (kind === 'word') return t.word
  if (kind === 'phrase') return t.phrase
  if (kind === 'formula') return t.formula
  if (kind === 'idiom') return t.idiom
  if (kind === 'image') return t.image
  return t.contrast
}

function renderIntroPanel(
  title: string,
  lead: string,
  pointLabel: string,
  points: string[],
  takeawayLabel: string,
  takeaway: string
) {
  return (
    <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
      <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
        <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {title}
        </p>

        <p className="text-[1rem] leading-8 text-stone-800">{lead}</p>

        <div className="mt-5 space-y-3">
          {points.map((point, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-[18px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                {pointLabel} {index + 1}
              </p>
              <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{point}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
            {takeawayLabel}
          </p>
          <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{takeaway}</p>
        </div>
      </div>
    </div>
  )
}

export default function WordLensView({
  isReady,
  isLoading,
  error,
  data,
  title,
  leadFallback,
  takeawayFallback,
  pointLabel,
  takeawayLabel,
  loadingLabel,
  loadingText,
  unavailableLabel,
  tryAgainLabel,
  changeLabel,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  shareLabel,
  shareStatus,
  copyStatus,
  customPromptValue,
  onCustomPromptChange,
  onRetry,
  onChangeMode,
  onCopy,
  onShare,
  onNodeSelect,
  onCustomDig,
}: WordLensViewProps) {
  const locale = detectLocale(changeLabel, title)
  const copy = UI_COPY[locale]
  const primaryNode = data?.nodes?.[0] ?? null

  if (!isReady) {
    return renderIntroPanel(
      title,
      leadFallback,
      pointLabel,
      [copy.intro1, copy.intro2, copy.intro3],
      takeawayLabel,
      takeawayFallback
    )
  }

  if (isLoading) {
    return (
      <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {loadingLabel}
          </p>
          <p className="text-[1.08rem] leading-9 text-stone-800">{loadingText}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {unavailableLabel}
          </p>
          <p className="text-[1.08rem] leading-9 text-stone-800">{error}</p>

          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            {tryAgainLabel}
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return renderIntroPanel(
      title,
      leadFallback,
      pointLabel,
      [copy.intro1, copy.intro2, copy.intro3],
      takeawayLabel,
      takeawayFallback
    )
  }

  return (
    <div className="tab-panel-enter mt-5 space-y-5">
      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {copy.keyReading}
            </p>

            <button
              type="button"
              onClick={onChangeMode}
              className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
            >
              {changeLabel}
            </button>
          </div>

          {primaryNode ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-stone-300/70 bg-[#fffaf1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  {kindBadge(primaryNode.kind, locale)}
                </span>

                <p className="text-[1.1rem] font-semibold leading-7 text-stone-900">
                  {primaryNode.label}
                </p>
              </div>

              <p className="mt-2 text-[0.98rem] leading-7 text-stone-800">
                <span className="font-semibold text-stone-900">{primaryNode.original}</span>
                {primaryNode.transliteration ? (
                  <span className="text-stone-500"> · {primaryNode.transliteration}</span>
                ) : null}
              </p>

              <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.keyShift}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.semantic_core}
                </p>
              </div>

              <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.whyItOpensMap}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.why_it_matters}
                </p>
              </div>
            </>
          ) : (
            <p className="text-[1rem] leading-8 text-stone-800">{data.lead}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700"
            >
              {copyStatus === 'copied'
                ? copiedLabel
                : copyStatus === 'failed'
                  ? copyFailedLabel
                  : copyLabel}
            </button>

            <button
              type="button"
              onClick={onShare}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700"
            >
              {shareLabel}
            </button>

            {shareStatus ? (
              <span className="self-center text-sm text-stone-500">{shareStatus}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {copy.wordMap}
          </p>

          <div className="space-y-4">
            {data.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onNodeSelect(node.id)}
                className="block w-full rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-stone-300/70 bg-[#fffaf1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {kindBadge(node.kind, locale)}
                  </span>

                  <p className="text-[1.04rem] font-semibold leading-7 text-stone-900">
                    {node.label}
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  <p className="text-[0.96rem] leading-7 text-stone-800">
                    <span className="font-semibold text-stone-900">{node.original}</span>
                    {node.transliteration ? (
                      <span className="text-stone-500"> · {node.transliteration}</span>
                    ) : null}
                  </p>
                </div>

                <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.semanticCore}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.semantic_core}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.whyThisMatters}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.why_it_matters}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.digDeeper}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.dig_deeper}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {copy.yourDiggingDirection}
          </p>

          <textarea
            value={customPromptValue}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder={copy.customPlaceholder}
            className="min-h-[120px] w-full rounded-[20px] border border-stone-300/70 bg-[#fffaf1] px-4 py-3 text-[0.98rem] leading-7 text-stone-800 outline-none placeholder:text-stone-400"
          />

          <button
            type="button"
            onClick={onCustomDig}
            className="mt-4 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            {copy.customButton}
          </button>
        </div>
      </div>
    </div>
  )
}
