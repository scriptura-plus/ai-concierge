'use client'

type RefinementResult = {
  title: string
  text: string
}

type LocaleCode = 'en' | 'ru' | 'es' | 'fr' | 'de'

type RefinementViewProps = {
  locale: LocaleCode
  isReady: boolean
  isLoading: boolean
  error: string
  inputValue: string
  result: RefinementResult | null
  copyStatus: 'idle' | 'copied' | 'failed'
  shareStatus: string
  onInputChange: (value: string) => void
  onGenerate: () => void
  onRegenerate: () => void
  onCopy: () => void
  onShare: () => void
}

const UI_COPY: Record<
  LocaleCode,
  {
    title: string
    introLead: string
    intro1: string
    intro2: string
    intro3: string
    introPointLabel: string
    introTakeawayLabel: string
    inputLabel: string
    inputPlaceholder: string
    resultLabel: string
    loadingLabel: string
    loadingText: string
    unavailableLabel: string
    generateLabel: string
    regenerateLabel: string
    copyLabel: string
    copiedLabel: string
    copyFailedLabel: string
    shareLabel: string
  }
> = {
  en: {
    title: 'Refine',
    introLead:
      'Turn a rough thought into a natural spoken comment that sounds like your own words and can still be shared as a clean card.',
    intro1:
      'The result should sound natural out loud, not like a written mini-article.',
    intro2:
      'It should move straight into the thought without template openings or artificial phrasing.',
    intro3:
      'One strong version is enough. If it does not feel right, regenerate it.',
    introPointLabel: 'Point',
    introTakeawayLabel: 'Takeaway',
    inputLabel: 'Your draft thought',
    inputPlaceholder:
      'Paste 1–2 sentences or a rough comment draft here...',
    resultLabel: 'Refined comment',
    loadingLabel: 'Refining comment',
    loadingText:
      'Shaping your draft into a natural 20–35 second spoken comment…',
    unavailableLabel: 'Unable to refine comment.',
    generateLabel: 'Generate',
    regenerateLabel: 'Regenerate',
    copyLabel: 'Copy',
    copiedLabel: 'Copied',
    copyFailedLabel: 'Copy failed',
    shareLabel: 'Share',
  },
  ru: {
    title: 'Огранка',
    introLead:
      'Преврати черновую мысль в естественный устный комментарий, который звучит как свои слова и при этом аккуратно выглядит как карточка.',
    intro1:
      'Результат должен звучать естественно вслух, а не как написанная мини-статья.',
    intro2:
      'Он должен сразу входить в мысль, без шаблонных заходов и искусственных фраз.',
    intro3:
      'Достаточно одного сильного варианта. Если он не лёг на слух, его можно перегенерировать.',
    introPointLabel: 'Пункт',
    introTakeawayLabel: 'Итог',
    inputLabel: 'Черновая мысль',
    inputPlaceholder:
      'Вставь сюда 1–2 предложения или черновик комментария...',
    resultLabel: 'Готовый комментарий',
    loadingLabel: 'Огранка комментария',
    loadingText:
      'Превращаем черновик в естественный устный комментарий на 20–35 секунд…',
    unavailableLabel: 'Не удалось огранить комментарий.',
    generateLabel: 'Сгенерировать',
    regenerateLabel: 'Перегенерировать',
    copyLabel: 'Копировать',
    copiedLabel: 'Скопировано',
    copyFailedLabel: 'Ошибка копирования',
    shareLabel: 'Поделиться',
  },
  es: {
    title: 'Refinar',
    introLead:
      'Convierte una idea en borrador en un comentario natural que suene como tus propias palabras y que todavía pueda compartirse como una tarjeta limpia.',
    intro1:
      'El resultado debe sonar natural en voz alta, no como un miniartículo escrito.',
    intro2:
      'Debe entrar directamente en la idea sin comienzos plantillados ni frases artificiales.',
    intro3:
      'Un solo buen resultado basta. Si no suena bien, vuelve a generarlo.',
    introPointLabel: 'Punto',
    introTakeawayLabel: 'Conclusión',
    inputLabel: 'Tu borrador',
    inputPlaceholder:
      'Pega aquí 1–2 frases o un borrador breve del comentario...',
    resultLabel: 'Comentario refinado',
    loadingLabel: 'Refinando comentario',
    loadingText:
      'Convirtiendo tu borrador en un comentario hablado natural de 20–35 segundos…',
    unavailableLabel: 'No se pudo refinar el comentario.',
    generateLabel: 'Generar',
    regenerateLabel: 'Regenerar',
    copyLabel: 'Copiar',
    copiedLabel: 'Copiado',
    copyFailedLabel: 'Error al copiar',
    shareLabel: 'Compartir',
  },
  fr: {
    title: 'Affiner',
    introLead:
      'Transformez une pensée brute en un commentaire oral naturel qui sonne comme vos propres mots et peut encore être partagé sous forme de carte propre.',
    intro1:
      'Le résultat doit sonner naturellement à l’oral, pas comme un mini-article écrit.',
    intro2:
      'Il doit entrer directement dans l’idée, sans formules toutes faites ni tournures artificielles.',
    intro3:
      'Une seule bonne version suffit. Si elle ne sonne pas juste, régénérez-la.',
    introPointLabel: 'Point',
    introTakeawayLabel: 'Conclusion',
    inputLabel: 'Votre brouillon',
    inputPlaceholder:
      'Collez ici 1–2 phrases ou un brouillon court du commentaire...',
    resultLabel: 'Commentaire affiné',
    loadingLabel: 'Affinage du commentaire',
    loadingText:
      'Transformation du brouillon en un commentaire oral naturel de 20–35 secondes…',
    unavailableLabel: 'Impossible d’affiner le commentaire.',
    generateLabel: 'Générer',
    regenerateLabel: 'Régénérer',
    copyLabel: 'Copier',
    copiedLabel: 'Copié',
    copyFailedLabel: 'Échec de copie',
    shareLabel: 'Partager',
  },
  de: {
    title: 'Verfeinern',
    introLead:
      'Verwandle einen rohen Gedanken in einen natürlichen gesprochenen Kommentar, der wie deine eigenen Worte klingt und sich trotzdem sauber als Karte teilen lässt.',
    intro1:
      'Das Ergebnis soll laut natürlich klingen, nicht wie ein geschriebener Mini-Artikel.',
    intro2:
      'Es soll direkt in den Gedanken gehen, ohne Schablonenanfänge oder künstliche Formulierungen.',
    intro3:
      'Eine starke Version reicht. Wenn sie nicht richtig klingt, generiere neu.',
    introPointLabel: 'Punkt',
    introTakeawayLabel: 'Fazit',
    inputLabel: 'Dein Entwurf',
    inputPlaceholder:
      'Füge hier 1–2 Sätze oder einen kurzen Kommentarentwurf ein...',
    resultLabel: 'Verfeinerter Kommentar',
    loadingLabel: 'Kommentar wird verfeinert',
    loadingText:
      'Dein Entwurf wird in einen natürlichen gesprochenen Kommentar von 20–35 Sekunden geformt…',
    unavailableLabel: 'Kommentar konnte nicht verfeinert werden.',
    generateLabel: 'Generieren',
    regenerateLabel: 'Neu generieren',
    copyLabel: 'Kopieren',
    copiedLabel: 'Kopiert',
    copyFailedLabel: 'Kopieren fehlgeschlagen',
    shareLabel: 'Teilen',
  },
}

function renderIntroPanel(
  title: string,
  lead: string,
  labelPrefix: string,
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
                {labelPrefix} {index + 1}
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

export default function RefinementView({
  locale,
  isReady,
  isLoading,
  error,
  inputValue,
  result,
  copyStatus,
  shareStatus,
  onInputChange,
  onGenerate,
  onRegenerate,
  onCopy,
  onShare,
}: RefinementViewProps) {
  const copy = UI_COPY[locale]
  const hasInput = inputValue.trim().length > 0

  if (!isReady) {
    return renderIntroPanel(
      copy.title,
      copy.introLead,
      copy.introPointLabel,
      [copy.intro1, copy.intro2, copy.intro3],
      copy.introTakeawayLabel,
      copy.intro3
    )
  }

  return (
    <div className="tab-panel-enter mt-5 space-y-5">
      <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {copy.inputLabel}
          </p>

          <textarea
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={copy.inputPlaceholder}
            className="min-h-[150px] w-full rounded-[20px] border border-stone-300/70 bg-[#fffaf1] px-4 py-3 text-[0.98rem] leading-7 text-stone-800 outline-none placeholder:text-stone-400"
          />

          {!result ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!hasInput || isLoading}
                className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {copy.generateLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {copy.loadingLabel}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{copy.loadingText}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {copy.unavailableLabel}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{error}</p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {copy.resultLabel}
            </p>

            <div className="rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-5 py-5">
              <p className="text-[1.24rem] font-semibold leading-8 text-stone-900">
                {result.title}
              </p>

              <p className="mt-4 text-[1rem] leading-8 text-stone-800">
                {result.text}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onCopy}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
              >
                {copyStatus === 'copied'
                  ? copy.copiedLabel
                  : copyStatus === 'failed'
                    ? copy.copyFailedLabel
                    : copy.copyLabel}
              </button>

              <button
                type="button"
                onClick={onShare}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
              >
                {copy.shareLabel}
              </button>

              <button
                type="button"
                onClick={onRegenerate}
                disabled={isLoading || !hasInput}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {copy.regenerateLabel}
              </button>
            </div>

            {shareStatus ? (
              <p className="mt-4 text-[0.92rem] leading-7 text-stone-600">{shareStatus}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
