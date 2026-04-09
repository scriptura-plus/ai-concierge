import ArticleView from './ArticleView'

type InsightItem = {
  title: string
  text: string
}

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type LensKind = 'translation' | 'word' | 'tension' | 'phrase'
type ContextKind = 'paragraph' | 'book' | 'bible'

type CardStackViewProps = {
  activeArticle: ArticlePayload | null
  activeArticleReference: string
  activeArticleShareStatus: string
  articleCopyStatus: 'idle' | 'copied' | 'failed'
  onBackFromArticle: () => void
  onCopyArticle: () => void
  onShareArticle: () => void

  insightsBlockingLoad: boolean
  insightsError: string
  rawOutput: string
  currentCards: InsightItem[]
  currentIndex: number
  insightsBackgroundFill: boolean
  activeTab: 'insights' | 'context' | 'lens'
  displayedCard: InsightItem | null

  selectedLens: LensKind | null
  selectedContext: ContextKind | null

  currentArticleStatus: 'idle' | 'generating' | 'ready' | 'failed'
  currentArticleError: string

  copyStatus: 'idle' | 'copied' | 'failed'
  shareStatus: string
  translationError: string

  onRetryInsights: () => void
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void
  onTouchEnd: () => void
  onUnfold: () => void
  onShare: () => void
  onPrev: () => void
  onNext: () => void
  onOpenLensSheet: () => void
  onOpenContextSheet: () => void

  t: {
    insightsLoading: string
    insightsLoadingText: string
    preparingModes: string
    unableToLoad: string
    tryAgain: string
    rawModelOutput: string
    noInsight: string
    noInsightText: string
    lensLabel: string
    change: string
    translation: string
    word: string
    tension: string
    phrase: string
    paragraph: string
    bookMode: string
    bibleMode: string
    generating: string
    openArticle: string
    unfold: string
    share: string
    articleReady: string
    copyFailed: string
    previous: string
    next: string
    article: string
    backToCards: string
    copyArticle: string
    shareArticle: string
    copied: string
    home: string
  }
}

function lensLabelValue(
  selectedLens: LensKind | null,
  t: CardStackViewProps['t']
) {
  if (selectedLens === 'translation') return t.translation
  if (selectedLens === 'word') return t.word
  if (selectedLens === 'tension') return t.tension
  return t.phrase
}

function contextLabelValue(
  selectedContext: ContextKind | null,
  t: CardStackViewProps['t']
) {
  if (selectedContext === 'paragraph') return t.paragraph
  if (selectedContext === 'book') return t.bookMode
  return t.bibleMode
}

export default function CardStackView({
  activeArticle,
  activeArticleReference,
  activeArticleShareStatus,
  articleCopyStatus,
  onBackFromArticle,
  onCopyArticle,
  onShareArticle,
  insightsBlockingLoad,
  insightsError,
  rawOutput,
  currentCards,
  currentIndex,
  insightsBackgroundFill,
  activeTab,
  displayedCard,
  selectedLens,
  selectedContext,
  currentArticleStatus,
  currentArticleError,
  copyStatus,
  shareStatus,
  translationError,
  onRetryInsights,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onUnfold,
  onShare,
  onPrev,
  onNext,
  onOpenLensSheet,
  onOpenContextSheet,
  t,
}: CardStackViewProps) {
  if (activeArticle) {
    return (
      <ArticleView
        article={activeArticle}
        reference={activeArticleReference}
        articleLabel={t.article}
        backToCardsLabel={t.backToCards}
        copyArticleLabel={t.copyArticle}
        shareArticleLabel={t.shareArticle}
        copiedLabel={t.copied}
        copyFailedLabel={t.copyFailed}
        homeLabel={t.home}
        copyStatus={articleCopyStatus}
        shareStatus={activeArticleShareStatus}
        onBack={onBackFromArticle}
        onCopy={onCopyArticle}
        onShare={onShareArticle}
      />
    )
  }

  if (insightsBlockingLoad) {
    return (
      <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/60 bg-[linear-gradient(180deg,#f7edd8_0%,#efe1bd_100%)] p-6 shadow-[0_12px_28px_rgba(94,72,37,0.10)]">
        <div className="rounded-[28px] border border-stone-300/50 bg-[#fbf6ea]/85 px-6 py-7">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {t.insightsLoading}
          </p>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-stone-300/50 bg-[#fffaf1] px-5 py-5">
              <div className="skeleton-line h-5 w-8/12 rounded-full bg-stone-200/85" />
              <div className="mt-4 space-y-3">
                <div className="skeleton-line h-4 w-full rounded-full bg-stone-200/75" />
                <div className="skeleton-line h-4 w-11/12 rounded-full bg-stone-200/75" />
                <div className="skeleton-line h-4 w-10/12 rounded-full bg-stone-200/75" />
                <div className="skeleton-line h-4 w-9/12 rounded-full bg-stone-200/75" />
              </div>
            </div>

            <div className="rounded-[24px] border border-stone-300/35 bg-[#fffaf1]/70 px-5 py-5">
              <div className="skeleton-line h-5 w-7/12 rounded-full bg-stone-200/70" />
              <div className="mt-4 space-y-3">
                <div className="skeleton-line h-4 w-full rounded-full bg-stone-200/65" />
                <div className="skeleton-line h-4 w-10/12 rounded-full bg-stone-200/65" />
                <div className="skeleton-line h-4 w-8/12 rounded-full bg-stone-200/65" />
              </div>
            </div>
          </div>

          <p className="mt-5 text-sm text-stone-500">{t.insightsLoadingText}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-400">
            {t.preparingModes}
          </p>
        </div>
      </div>
    )
  }

  if (insightsError && currentCards.length === 0) {
    return (
      <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {t.unableToLoad}
          </p>
          <p className="mb-4 text-[1.08rem] leading-9 text-stone-800">{insightsError}</p>

          <button
            type="button"
            onClick={onRetryInsights}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            {t.tryAgain}
          </button>

          {rawOutput && (
            <div className="mt-5 rounded-2xl border border-stone-300/50 bg-[#fffaf0] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                {t.rawModelOutput}
              </p>
              <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                {rawOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="tab-panel-enter mt-5">
      {currentCards.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-stone-500">
            {currentIndex + 1} / {currentCards.length}
          </p>
          {insightsBackgroundFill && activeTab === 'insights' && (
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-400">
              {t.preparingModes}
            </p>
          )}
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="card-pop rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]"
      >
        {displayedCard ? (
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            {activeTab === 'lens' && selectedLens && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#fffaf1]/80 px-3 py-1.5 text-sm font-medium text-stone-600 shadow-[0_4px_12px_rgba(94,72,37,0.06)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                  <span>{lensLabelValue(selectedLens, t)}</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenLensSheet}
                  className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
                >
                  {t.change}
                </button>
              </div>
            )}

            {activeTab === 'context' && selectedContext && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#fffaf1]/80 px-3 py-1.5 text-sm font-medium text-stone-600 shadow-[0_4px_12px_rgba(94,72,37,0.06)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                  <span>{contextLabelValue(selectedContext, t)}</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenContextSheet}
                  className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
                >
                  {t.change}
                </button>
              </div>
            )}

            <h2 className="title-fade mb-5 text-center text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
              {displayedCard.title}
            </h2>

            <p className="text-fade text-[1.08rem] leading-9 text-stone-800">{displayedCard.text}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onUnfold}
                disabled={currentArticleStatus === 'generating'}
                className={`rounded-full border px-5 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all duration-200 ease-out disabled:opacity-60 active:scale-[0.985] ${
                  currentArticleStatus === 'ready'
                    ? 'border-[#a58a57] bg-[linear-gradient(180deg,#efe2bf_0%,#e5d3a8_100%)] text-stone-900 shadow-[0_10px_22px_rgba(94,72,37,0.14)] hover:brightness-[0.99]'
                    : currentArticleStatus === 'generating'
                      ? 'border-stone-300 bg-[linear-gradient(180deg,#f5ecda_0%,#ecdfc1_100%)] text-stone-600 shadow-[0_8px_18px_rgba(94,72,37,0.08)]'
                      : 'border-[#7b6540] bg-[linear-gradient(180deg,#5f4d31_0%,#4b3b24_100%)] text-[#fbf6ea] shadow-[0_14px_28px_rgba(60,44,21,0.22)] hover:translate-y-[-1px] hover:shadow-[0_18px_34px_rgba(60,44,21,0.26)]'
                }`}
              >
                {currentArticleStatus === 'generating'
                  ? t.generating
                  : currentArticleStatus === 'ready'
                    ? t.openArticle
                    : t.unfold}
              </button>

              <button
                type="button"
                onClick={onShare}
                className="rounded-full border border-stone-300/90 bg-[linear-gradient(180deg,rgba(255,250,241,0.96)_0%,rgba(248,239,220,0.9)_100%)] px-5 py-2.5 text-sm font-medium text-stone-700 shadow-[0_8px_18px_rgba(94,72,37,0.08)] transition-all duration-200 ease-out hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,rgba(255,250,241,1)_0%,rgba(245,233,207,0.96)_100%)] hover:shadow-[0_12px_24px_rgba(94,72,37,0.12)] active:scale-[0.985]"
              >
                {t.share}
              </button>
            </div>

            {currentArticleStatus === 'failed' && currentArticleError && (
              <p className="mt-3 text-center text-sm text-red-700">{currentArticleError}</p>
            )}

            {currentArticleStatus === 'ready' && (
              <p className="mt-3 text-center text-sm text-stone-500">{t.articleReady}</p>
            )}

            {shareStatus && <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>}

            {translationError && (
              <p className="mt-3 text-center text-sm text-red-700">{translationError}</p>
            )}
          </div>
        ) : (
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.noInsight}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{t.noInsightText}</p>
          </div>
        )}
      </div>

      {currentCards.length > 1 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-base font-medium text-stone-800 shadow-[0_8px_18px_rgba(28,25,23,0.08)] transition hover:bg-[#f8efdc]"
          >
            {t.previous}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="rounded-[24px] bg-stone-900 px-4 py-4 text-base font-medium text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.18)] transition hover:bg-stone-800"
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  )
}
