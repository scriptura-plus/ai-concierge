'use client'

type PhraseNodeKind =
  | 'precision'
  | 'framing'
  | 'sequence'
  | 'restriction'
  | 'emphasis'
  | 'rhetorical_choice'

type PhraseLensNode = {
  id: string
  kind: PhraseNodeKind
  label: string
  phrase_line: string
  what_is_precise: string
  why_this_wording: string
  dig_deeper: string
}

type PhraseLensPayload = {
  lead: string
  nodes: PhraseLensNode[]
}

type LocaleCode = 'en' | 'ru' | 'es' | 'fr' | 'de'

type PhraseLensViewProps = {
  locale: LocaleCode
  isReady: boolean
  isLoading: boolean
  error: string
  data: PhraseLensPayload | null
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
  customPromptValue: string
  onCustomPromptChange: (value: string) => void
  onRetry: () => void
  onChangeMode: () => void
  onNodeSelect: (nodeId: string) => void
  onCustomDig: () => void
}

const UI_COPY: Record<
  LocaleCode,
  {
    intro1: string
    intro2: string
    intro3: string
    phraseKey: string
    exactForce: string
    whyThisPhrasing: string
    phraseMap: string
    phraseLine: string
    whatIsPrecise: string
    whyThisWording: string
    digDeeper: string
    yourDiggingDirection: string
    customPlaceholder: string
    customButton: string
    precision: string
    framing: string
    sequence: string
    restriction: string
    emphasis: string
    rhetoricalChoice: string
  }
> = {
  en: {
    intro1:
      'This lens tracks the exact force of the phrasing, not just the meaning of single words.',
    intro2:
      'The goal is to show why the verse is said in this precise way and what would be lost in a looser paraphrase.',
    intro3:
      'Each node should feel like a formulation choice: framing, narrowing, ordering, emphasis, or rhetorical shape.',
    phraseKey: 'Phrase key',
    exactForce: 'Exact force',
    whyThisPhrasing: 'Why this phrasing matters',
    phraseMap: 'Phrase map',
    phraseLine: 'Phrase line',
    whatIsPrecise: 'What is precise here',
    whyThisWording: 'Why this wording',
    digDeeper: 'Dig deeper',
    yourDiggingDirection: 'Your own digging direction',
    customPlaceholder: 'Describe what exact phrasing choice you want to dig into in this verse...',
    customButton: 'Dig into this phrasing',
    precision: 'Precision',
    framing: 'Framing',
    sequence: 'Sequence',
    restriction: 'Restriction',
    emphasis: 'Emphasis',
    rhetoricalChoice: 'Rhetorical choice',
  },
  ru: {
    intro1:
      'Эта линза отслеживает точную силу формулировки, а не просто смысл отдельных слов.',
    intro2:
      'Задача здесь — показать, почему мысль сказана именно так и что потерялось бы в более вольном пересказе.',
    intro3:
      'Каждый узел должен ощущаться как решение формулировки: рамка, сужение, порядок, акцент или риторический выбор.',
    phraseKey: 'Ключ фразы',
    exactForce: 'Точная сила',
    whyThisPhrasing: 'Почему важна именно эта формулировка',
    phraseMap: 'Карта формулировок',
    phraseLine: 'Линия фразы',
    whatIsPrecise: 'Что здесь сделано точно',
    whyThisWording: 'Почему именно так сказано',
    digDeeper: 'Куда копать дальше',
    yourDiggingDirection: 'Своё направление поиска',
    customPlaceholder: 'Опиши, какую именно формулировку в этом стихе ты хочешь разобрать глубже...',
    customButton: 'Копать эту формулировку',
    precision: 'Точность',
    framing: 'Рамка',
    sequence: 'Порядок',
    restriction: 'Ограничение',
    emphasis: 'Акцент',
    rhetoricalChoice: 'Риторический выбор',
  },
  es: {
    intro1:
      'Esta lente sigue la fuerza exacta de la formulación, no solo el significado de palabras aisladas.',
    intro2:
      'La meta es mostrar por qué el versículo está dicho de esta manera exacta y qué se perdería en una paráfrasis más suelta.',
    intro3:
      'Cada nodo debe sentirse como una decisión de formulación: marco, restricción, orden, énfasis o elección retórica.',
    phraseKey: 'Clave de frase',
    exactForce: 'Fuerza exacta',
    whyThisPhrasing: 'Por qué importa esta formulación',
    phraseMap: 'Mapa de formulación',
    phraseLine: 'Línea de frase',
    whatIsPrecise: 'Qué es preciso aquí',
    whyThisWording: 'Por qué esta redacción',
    digDeeper: 'Profundizar',
    yourDiggingDirection: 'Tu propia dirección de búsqueda',
    customPlaceholder: 'Describe qué decisión exacta de formulación quieres explorar en este versículo...',
    customButton: 'Explorar esta formulación',
    precision: 'Precisión',
    framing: 'Marco',
    sequence: 'Secuencia',
    restriction: 'Restricción',
    emphasis: 'Énfasis',
    rhetoricalChoice: 'Elección retórica',
  },
  fr: {
    intro1:
      'Cette lentille suit la force exacte de la formulation, pas seulement le sens de mots isolés.',
    intro2:
      'Le but est de montrer pourquoi le verset est formulé exactement ainsi et ce qui se perdrait dans une paraphrase plus libre.',
    intro3:
      'Chaque nœud doit ressembler à un choix de formulation: cadrage, resserrement, ordre, accent ou choix rhétorique.',
    phraseKey: 'Clé de formulation',
    exactForce: 'Force exacte',
    whyThisPhrasing: 'Pourquoi cette formulation compte',
    phraseMap: 'Carte des formulations',
    phraseLine: 'Ligne de formulation',
    whatIsPrecise: 'Ce qui est précis ici',
    whyThisWording: 'Pourquoi cette formulation',
    digDeeper: 'Creuser plus loin',
    yourDiggingDirection: 'Votre propre direction de recherche',
    customPlaceholder: 'Décrivez quelle décision exacte de formulation vous voulez approfondir dans ce verset...',
    customButton: 'Creuser cette formulation',
    precision: 'Précision',
    framing: 'Cadrage',
    sequence: 'Séquence',
    restriction: 'Restriction',
    emphasis: 'Accent',
    rhetoricalChoice: 'Choix rhétorique',
  },
  de: {
    intro1:
      'Diese Linse verfolgt die genaue Kraft der Formulierung, nicht nur die Bedeutung einzelner Wörter.',
    intro2:
      'Das Ziel ist zu zeigen, warum der Vers genau so gesagt ist und was in einer freieren Paraphrase verloren ginge.',
    intro3:
      'Jeder Knoten soll wie eine Formulierungsentscheidung wirken: Rahmung, Eingrenzung, Reihenfolge, Betonung oder rhetorische Wahl.',
    phraseKey: 'Formulierungsschlüssel',
    exactForce: 'Genaue Kraft',
    whyThisPhrasing: 'Warum diese Formulierung wichtig ist',
    phraseMap: 'Formulierungskarte',
    phraseLine: 'Formulierungslinie',
    whatIsPrecise: 'Was hier präzise ist',
    whyThisWording: 'Warum diese Wortwahl',
    digDeeper: 'Weiter graben',
    yourDiggingDirection: 'Eigene Suchrichtung',
    customPlaceholder: 'Beschreibe, welche genaue Formulierungsentscheidung du in diesem Vers tiefer untersuchen willst...',
    customButton: 'Diese Formulierung vertiefen',
    precision: 'Präzision',
    framing: 'Rahmung',
    sequence: 'Reihenfolge',
    restriction: 'Eingrenzung',
    emphasis: 'Betonung',
    rhetoricalChoice: 'Rhetorische Wahl',
  },
}

function detectLocale(changeLabel: string, title: string): LocaleCode {
  const source = `${changeLabel} ${title}`.toLowerCase()

  if (/[а-яё]/i.test(source)) return 'ru'
  if (source.includes('cambiar') || source.includes('lente') || source.includes('frase')) return 'es'
  if (source.includes('changer') || source.includes('lentille') || source.includes('phrase')) return 'fr'
  if (source.includes('ändern') || source.includes('linse') || source.includes('formulierung')) return 'de'

  return 'en'
}

function kindBadge(kind: PhraseNodeKind, locale: LocaleCode) {
  const t = UI_COPY[locale]

  if (kind === 'precision') return t.precision
  if (kind === 'framing') return t.framing
  if (kind === 'sequence') return t.sequence
  if (kind === 'restriction') return t.restriction
  if (kind === 'emphasis') return t.emphasis
  return t.rhetoricalChoice
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

export default function PhraseLensView({
  locale,
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
  customPromptValue,
  onCustomPromptChange,
  onRetry,
  onChangeMode,
  onNodeSelect,
  onCustomDig,
}: PhraseLensViewProps) {
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
              {copy.phraseKey}
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

              <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.exactForce}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.what_is_precise}
                </p>
              </div>

              <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.whyThisPhrasing}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.why_this_wording}
                </p>
              </div>
            </>
          ) : (
            <p className="text-[1rem] leading-8 text-stone-800">{data.lead}</p>
          )}
        </div>
      </div>

      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {copy.phraseMap}
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

                <div className="mt-4 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.phraseLine}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.phrase_line}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.whatIsPrecise}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.what_is_precise}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.whyThisWording}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.why_this_wording}
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
