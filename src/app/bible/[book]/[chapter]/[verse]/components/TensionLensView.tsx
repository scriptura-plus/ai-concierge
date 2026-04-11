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
    keyTension: string
    hiddenPressure: string
    whyThisTensionMatters: string
    tensionMap: string
    tensionLine: string
    whatFeelsStrange: string
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
      'This lens builds a map of the strongest pressure-points inside the verse.',
    intro2:
      'The goal is not lexical depth, but the places where the wording resists a smooth reading.',
    intro3:
      'Each node should feel like real inner force: contrast, paradox, reversal, collision, pressure, or shock.',
    keyTension: 'Key tension',
    hiddenPressure: 'Hidden pressure',
    whyThisTensionMatters: 'Why this tension matters',
    tensionMap: 'Tension map',
    tensionLine: 'Tension line',
    whatFeelsStrange: 'What feels strange',
    whyThisMatters: 'Why this matters',
    digDeeper: 'Dig deeper',
    yourDiggingDirection: 'Your own digging direction',
    customPlaceholder: 'Describe what exact tension you want to explore in this verse...',
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
      'Эта линза строит карту самых сильных точек напряжения внутри самого стиха.',
    intro2:
      'Задача здесь не в разборе слов как таковых, а в тех местах, где текст не даёт прочитать себя слишком гладко.',
    intro3:
      'Каждый узел должен ощущаться как внутренняя сила стиха: контраст, парадокс, разворот, столкновение, давление или шок.',
    keyTension: 'Ключевое напряжение',
    hiddenPressure: 'Скрытое давление',
    whyThisTensionMatters: 'Почему это напряжение важно',
    tensionMap: 'Карта напряжений',
    tensionLine: 'Линия напряжения',
    whatFeelsStrange: 'Что здесь ощущается необычно',
    whyThisMatters: 'Почему это важно',
    digDeeper: 'Куда копать дальше',
    yourDiggingDirection: 'Своё направление поиска',
    customPlaceholder: 'Опиши, какое именно напряжение ты хочешь исследовать в этом стихе...',
    customButton: 'Копать это напряжение',
    contrast: 'Контраст',
    paradox: 'Парадокс',
    reversal: 'Разворот',
    shock: 'Шок',
    pressure: 'Давление',
    collision: 'Столкновение',
  },
  es: {
    intro1:
      'Esta lente construye un mapa de los puntos de presión más fuertes dentro del versículo.',
    intro2:
      'La meta no es profundidad léxica, sino los lugares donde la redacción resiste una lectura demasiado fluida.',
    intro3:
      'Cada nodo debe sentirse como una fuerza interna real: contraste, paradoja, giro, colisión, presión o choque.',
    keyTension: 'Tensión clave',
    hiddenPressure: 'Presión oculta',
    whyThisTensionMatters: 'Por qué importa esta tensión',
    tensionMap: 'Mapa de tensiones',
    tensionLine: 'Línea de tensión',
    whatFeelsStrange: 'Qué se siente extraño',
    whyThisMatters: 'Por qué importa',
    digDeeper: 'Profundizar',
    yourDiggingDirection: 'Tu propia dirección de búsqueda',
    customPlaceholder: 'Describe qué tensión exacta quieres explorar en este versículo...',
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
      'Cette lentille construit une carte des points de pression les plus forts dans le verset.',
    intro2:
      'Le but n’est pas la profondeur lexicale, mais les endroits où la formulation résiste à une lecture trop lisse.',
    intro3:
      'Chaque nœud doit ressembler à une vraie force intérieure: contraste, paradoxe, renversement, collision, pression ou choc.',
    keyTension: 'Tension clé',
    hiddenPressure: 'Pression cachée',
    whyThisTensionMatters: 'Pourquoi cette tension compte',
    tensionMap: 'Carte des tensions',
    tensionLine: 'Ligne de tension',
    whatFeelsStrange: 'Ce qui semble étrange',
    whyThisMatters: 'Pourquoi cela compte',
    digDeeper: 'Creuser plus loin',
    yourDiggingDirection: 'Votre propre direction de recherche',
    customPlaceholder: 'Décrivez la tension exacte que vous voulez explorer dans ce verset...',
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
      'Diese Linse baut eine Karte der stärksten Spannungspunkte im Vers.',
    intro2:
      'Das Ziel ist nicht lexikalische Tiefe, sondern die Stellen, an denen sich der Text einer zu glatten Lesart widersetzt.',
    intro3:
      'Jeder Knoten soll wie echte innere Kraft wirken: Kontrast, Paradox, Umkehrung, Kollision, Druck oder Schock.',
    keyTension: 'Schlüsselspannung',
    hiddenPressure: 'Verborgener Druck',
    whyThisTensionMatters: 'Warum diese Spannung wichtig ist',
    tensionMap: 'Spannungskarte',
    tensionLine: 'Spannungslinie',
    whatFeelsStrange: 'Was hier ungewöhnlich wirkt',
    whyThisMatters: 'Warum das wichtig ist',
    digDeeper: 'Weiter graben',
    yourDiggingDirection: 'Eigene Suchrichtung',
    customPlaceholder: 'Beschreibe, welche genaue Spannung du in diesem Vers erforschen willst...',
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
  if (source.includes('cambiar') || source.includes('lente') || source.includes('tensión')) {
    return 'es'
  }
  if (source.includes('changer') || source.includes('lentille') || source.includes('tension')) {
    return 'fr'
  }
  if (source.includes('ändern') || source.includes('linse') || source.includes('spannung')) {
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
  customPromptValue,
  onCustomPromptChange,
  onRetry,
  onChangeMode,
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
                  {copy.hiddenPressure}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                  {primaryNode.tension_line}
                </p>
              </div>

              <div className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {copy.whyThisTensionMatters}
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
