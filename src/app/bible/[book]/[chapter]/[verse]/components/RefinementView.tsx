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
      'Turn the foundation of a comment into a natural spoken response that sounds like your own words and is still clean enough to share as a card.',
    intro1:
      'You can paste 1–2 strong sentences that should remain the core of the final comment.',
    intro2:
      'The result should sound natural out loud, not like a written mini-article or an overbuilt speech.',
    intro3:
      'The system should preserve strong wording where possible and build a complete 30-second comment around it.',
    introPointLabel: 'Point',
    introTakeawayLabel: 'Takeaway',
    inputLabel: 'Comment foundation',
    inputPlaceholder:
      'Paste 1–2 strong sentences that should remain the core of the final comment...',
    resultLabel: 'Refined comment',
    loadingLabel: 'Refining comment',
    loadingText:
      'Building a natural congregation-ready spoken comment around your core thought…',
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
      'Преврати основу комментария в естественный устный ответ, который звучит как свои слова и при этом аккуратно выглядит как карточка.',
    intro1:
      'Сюда можно вставить 1–2 сильные фразы, которые должны остаться смысловым ядром готового комментария.',
    intro2:
      'Результат должен звучать естественно вслух, а не как написанная мини-статья или переусложнённая мини-речь.',
    intro3:
      'Система должна по возможности сохранить удачную формулировку и достроить вокруг неё полноценный комментарий примерно на 30 секунд.',
    introPointLabel: 'Пункт',
    introTakeawayLabel: 'Итог',
    inputLabel: 'Основа комментария',
    inputPlaceholder:
      'Вставь 1–2 сильные фразы, которые должны остаться смысловым ядром готового комментария...',
    resultLabel: 'Готовый комментарий',
    loadingLabel: 'Огранка комментария',
    loadingText:
      'Достраиваем вокруг твоей мысли естественный устный комментарий для собрания…',
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
      'Convierte la base de un comentario en una respuesta hablada natural que suene como tus propias palabras y que aún pueda compartirse como una tarjeta limpia.',
    intro1:
      'Aquí puedes pegar 1–2 frases fuertes que deben seguir siendo el núcleo del comentario final.',
    intro2:
      'El resultado debe sonar natural en voz alta, no como un miniartículo escrito ni como un discurso excesivamente construido.',
    intro3:
      'El sistema debe conservar la buena redacción cuando sea posible y construir alrededor de ella un comentario completo de unos 30 segundos.',
    introPointLabel: 'Punto',
    introTakeawayLabel: 'Conclusión',
    inputLabel: 'Base del comentario',
    inputPlaceholder:
      'Pega 1–2 frases fuertes que deban seguir siendo el núcleo del comentario final...',
    resultLabel: 'Comentario refinado',
    loadingLabel: 'Refinando comentario',
    loadingText:
      'Construyendo un comentario hablado natural para la congregación alrededor de tu idea central…',
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
      'Transformez la base d’un commentaire en une réponse orale naturelle qui sonne comme vos propres mots et reste assez propre pour être partagée comme carte.',
    intro1:
      'Vous pouvez coller ici 1–2 phrases fortes qui doivent rester le noyau du commentaire final.',
    intro2:
      'Le résultat doit sonner naturellement à l’oral, pas comme un mini-article écrit ni comme un discours trop fabriqué.',
    intro3:
      'Le système doit préserver une bonne formulation lorsque c’est possible et construire autour d’elle un commentaire complet d’environ 30 secondes.',
    introPointLabel: 'Point',
    introTakeawayLabel: 'Conclusion',
    inputLabel: 'Base du commentaire',
    inputPlaceholder:
      'Collez 1–2 phrases fortes qui doivent rester le noyau du commentaire final...',
    resultLabel: 'Commentaire affiné',
    loadingLabel: 'Affinage du commentaire',
    loadingText:
      'Construction d’un commentaire oral naturel pour l’assemblée autour de votre idée centrale…',
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
      'Verwandle die Grundlage eines Kommentars in eine natürliche gesprochene Antwort, die wie deine eigenen Worte klingt und sich trotzdem sauber als Karte teilen lässt.',
    intro1:
      'Hier kannst du 1–2 starke Sätze einfügen, die der gedankliche Kern des fertigen Kommentars bleiben sollen.',
    intro2:
      'Das Ergebnis soll laut natürlich klingen, nicht wie ein geschriebener Mini-Artikel oder eine überbaute Mini-Rede.',
    intro3:
      'Das System soll starke Formulierungen möglichst bewahren und darum einen vollständigen Kommentar von etwa 30 Sekunden aufbauen.',
    introPointLabel: 'Punkt',
    introTakeawayLabel: 'Fazit',
    inputLabel: 'Grundlage des Kommentars',
    inputPlaceholder:
      'Füge 1–2 starke Sätze ein, die der gedankliche Kern des fertigen Kommentars bleiben sollen...',
    resultLabel: 'Verfeinerter Kommentar',
    loadingLabel: 'Kommentar wird verfeinert',
    loadingText:
      'Rund um deinen Kerngedanken wird ein natürlicher gesprochener Kommentar für die Zusammenkunft aufgebaut…',
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
            <div className="mt-4 flex justify-center">
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

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
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
                onClick={onRegenerate}
                disabled={isLoading || !hasInput}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {copy.regenerateLabel}
              </button>

              <button
                type="button"
                onClick={onShare}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
              >
                {copy.shareLabel}
              </button>
            </div>

            {shareStatus ? (
              <p className="mt-4 text-center text-[0.92rem] leading-7 text-stone-600">
                {shareStatus}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
