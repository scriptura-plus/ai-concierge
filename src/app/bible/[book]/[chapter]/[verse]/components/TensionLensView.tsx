'use client'

type TensionNodeKind =
  | 'contrast'
  | 'paradox'
  | 'reversal'
  | 'shock'
  | 'pressure'
  | 'collision'

type TensionLensNode = {
  id: string
  kind: TensionNodeKind
  label: string
  tension_line: string
  what_feels_strange: string
  why_it_matters: string
  dig_deeper: string
}

type TensionLensPayload = {
  lead: string
  nodes: TensionLensNode[]
}

type LocaleCode = 'en' | 'ru' | 'es' | 'fr' | 'de'

type TensionLensViewProps = {
  isReady: boolean
  isLoading: boolean
  error: string
  data: TensionLensPayload | null
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
    keyTension: string
    tensionLine: string
    whatFeelsStrange: string
    whyThisOpens: string
    tensionMap: string
    whyThisMatters: string
    digDeeper: string
    yourDiggingDirection: string
    customPlaceholder: string
    customButton: string
    contrast: string
    paradox: string
    reversal: string
    shock: string
    pressure: string
    collision: string
  }
> = {
  en: {
    intro1:
      'This lens maps the strongest pressure-points inside the verse — the places where the wording resists a smooth first reading.',
    intro2:
      'The goal is not lexical depth, but inner tension: contrast, reversal, paradox, collision, or rhetorical pressure.',
    intro3:
      'Each node should feel like a real fracture-line in the verse where meaning becomes sharper, stranger, or more forceful.',
    keyTension: 'Key tension',
    tensionLine: 'Tension line',
    whatFeelsStrange: 'What feels strange',
    whyThisOpens: 'Why this opens the verse',
    tensionMap: 'Tension map',
    whyThisMatters: 'Why this matters',
    digDeeper: 'Dig deeper',
    yourDiggingDirection: 'Your own digging direction',
    customPlaceholder: 'Describe what tension or pressure-point you want to explore more deeply...',
    customButton: 'Dig into this tension',
    contrast: 'Contrast',
    paradox: 'Paradox',
    reversal: 'Reversal',
    shock: 'Shock',
    pressure: 'Pressure',
    collision: 'Collision',
  },
  ru: {
    intro1:
      'Эта линза показывает самые сильные точки напряжения внутри стиха — места, где текст не даёт прочитать себя слишком гладко.',
    intro2:
      'Задача здесь не в лексической глубине, а во внутреннем напряжении: контрасте, перевороте, парадоксе, столкновении или смысловом давлении.',
    intro3:
      'Каждый узел должен ощущаться как настоящая линия разлома, где стих становится острее, страннее или сильнее.',
    keyTension: 'Ключевое напряжение',
    tensionLine: 'Линия напряжения',
    whatFeelsStrange: 'Что здесь ощущается непривычно',
    whyThisOpens: 'Почему отсюда стих раскрывается',
    tensionMap: 'Карта напряжений',
    whyThisMatters: 'Почему это важно',
    digDeeper: 'Куда копать дальше',
    yourDiggingDirection: 'Своё направление поиска',
    customPlaceholder: 'Опиши, какое напряжение или внутренний узел ты хочешь исследовать глубже...',
    customButton: 'Копать это напряжение',
    contrast: 'Контраст',
    paradox: 'Парадокс',
    reversal: 'Переворот',
    shock: 'Шок',
    pressure: 'Давление',
    collision: 'Столкновение',
  },
  es: {
    intro1:
      'Esta lente muestra los puntos de presión más fuertes dentro del versículo: los lugares donde la redacción se resiste a una lectura demasiado fluida.',
    intro2:
      'La meta aquí no es la profundidad léxica, sino la tensión interna: contraste, giro, paradoja, choque o presión retórica.',
    intro3:
      'Cada nodo debe sentirse como una verdadera línea de fractura donde el versículo se vuelve más agudo, extraño o intenso.',
    keyTension: 'Tensión clave',
    tensionLine: 'Línea de tensión',
    whatFeelsStrange: 'Qué se siente extraño',
    whyThisOpens: 'Por qué esto abre el versículo',
    tensionMap: 'Mapa de tensiones',
    whyThisMatters: 'Por qué importa',
    digDeeper: 'Profundizar',
    yourDiggingDirection: 'Tu propia dirección de búsqueda',
    customPlaceholder: 'Describe qué tensión o punto de presión quieres explorar más a fondo...',
    customButton: 'Explorar esta tensión',
    contrast: 'Contraste',
    paradox: 'Paradoja',
    reversal: 'Giro',
    shock: 'Choque',
    pressure: 'Presión',
    collision: 'Colisión',
  },
  fr: {
    intro1:
      'Cette lentille montre les points de tension les plus forts dans le verset — les endroits où la formulation résiste à une lecture trop lisse.',
    intro2:
      'Le but ici n’est pas la profondeur lexicale, mais la tension interne : contraste, renversement, paradoxe, collision ou pression rhétorique.',
    intro3:
      'Chaque nœud doit ressembler à une vraie ligne de fracture où le verset devient plus vif, plus étrange ou plus puissant.',
    keyTension: 'Tension clé',
    tensionLine: 'Ligne de tension',
    whatFeelsStrange: 'Ce qui paraît étrange',
    whyThisOpens: 'Pourquoi cela ouvre le verset',
    tensionMap: 'Carte des tensions',
    whyThisMatters: 'Pourquoi cela compte',
    digDeeper: 'Creuser plus loin',
    yourDiggingDirection: 'Votre propre direction de recherche',
    customPlaceholder: 'Décrivez quelle tension ou quel point de pression vous voulez explorer plus profondément...',
    customButton: 'Creuser cette tension',
    contrast: 'Contraste',
    paradox: 'Paradoxe',
    reversal: 'Renversement',
    shock: 'Choc',
    pressure: 'Pression',
    collision: 'Collision',
  },
  de: {
    intro1:
      'Diese Linse zeigt die stärksten Spannungspunkte im Vers — die Stellen, an denen sich die Formulierung gegen eine zu glatte Erstlesung sperrt.',
    intro2:
      'Das Ziel ist hier nicht lexikalische Tiefe, sondern innere Spannung: Kontrast, Umkehrung, Paradox, Kollision oder rhetorischer Druck.',
    intro3:
      'Jeder Knoten soll wie eine echte Bruchlinie wirken, an der der Vers schärfer, fremder oder kraftvoller wird.',
    keyTension: 'Kernspannung',
    tensionLine: 'Spannungslinie',
    whatFeelsStrange: 'Was daran ungewöhnlich wirkt',
    whyThisOpens: 'Warum sich der Vers hier öffnet',
    tensionMap: 'Spannungskarte',
    whyThisMatters: 'Warum das wichtig ist',
    digDeeper: 'Weiter graben',
    yourDiggingDirection: 'Eigene Suchrichtung',
    customPlaceholder: 'Beschreibe, welche Spannung oder welchen inneren Druckpunkt du tiefer untersuchen willst...',
    customButton: 'Diese Spannung vertiefen',
    contrast: 'Kontrast',
    paradox: 'Paradox',
    reversal: 'Umkehrung',
    shock: 'Schock',
    pressure: 'Druck',
    collision: 'Kollision',
  },
}

function detectLocale(changeLabel: string, title: string): LocaleCode {
  const source = `${changeLabel} ${title}`.toLowerCase()

  if (/[а-яё]/i.test(source)) return 'ru'
  if (
    source.includes('cambiar') ||
    source.includes('lente') ||
    source.includes('tensión')
  ) {
    return 'es'
  }
  if (
    source.includes('changer') ||
    source.includes('lentille') ||
    source.includes('tension')
  ) {
    return 'fr'
  }
  if (
    source.includes('ändern') ||
    source.includes('linse') ||
    source.includes('spannung')
  ) {
    return 'de'
  }

  return 'en'
}

function kindBadge(kind: TensionNodeKind, locale: LocaleCode) {
  const t = UI_COPY[locale]

  if (kind === 'contrast') return t.contrast
  if (kind === 'paradox') return t.paradox
  if (kind === 'reversal') return t.reversal
  if (kind === 'shock') return t.shock
  if (kind === 'pressure') return t.pressure
  return t.collision
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

export default function TensionLensView({
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
}: TensionLensViewProps) {
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
              {copy.keyTension}
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
                  {copy.tensionLine}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.tension_line}
                </p>
              </div>

              <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.whatFeelsStrange}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.what_feels_strange}
                </p>
              </div>

              <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.whyThisOpens}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.why_it_matters}
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
            {copy.tensionMap}
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
                    {copy.tensionLine}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.tension_line}
                  </p>
                </div>

                <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {copy.whatFeelsStrange}
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">
                    {node.what_feels_strange}
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
