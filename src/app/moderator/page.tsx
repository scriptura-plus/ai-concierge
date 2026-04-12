'use client'

import Link from 'next/link'

type VerseQueueItem = {
  reference: string
  href: string
  curatedCount: number
  candidateCount: number
  newCount: number
  updatedLabel: string
  sources: string[]
}

type DashboardProps = {
  summary?: {
    newCandidates: number
    versesInQueue: number
    withSaved: number
    needAttention: number
  }
  queue?: VerseQueueItem[]
}

function statCard(label: string, value: number) {
  return (
    <div className="min-w-[180px] rounded-[22px] border border-stone-300/70 bg-[#fffaf1] px-4 py-4 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-stone-900">{value}</p>
    </div>
  )
}

function sourceLabel(source: string) {
  if (source === 'user_request') return 'user'
  if (source === 'background_fill') return 'background'
  if (source === 'repair') return 'repair'
  if (source === 'unfold_derived') return 'unfold'
  return source
}

export default function ModeratorIndexPage({
  summary = {
    newCandidates: 0,
    versesInQueue: 0,
    withSaved: 0,
    needAttention: 0,
  },
  queue = [],
}: DashboardProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F7F5EF_0%,#F3F0E8_46%,#F6F3EC_100%)] text-stone-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Moderator
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            Кандидаты
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Система подготовила новые карточки для обзора. Открой стих, посмотри лучшие
            предложения, сохрани сильное, убери мусор или доработай почти удачные варианты.
          </p>
        </div>

        <section className="mb-8">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
            {statCard('Новые кандидаты', summary.newCandidates)}
            {statCard('Стихи в очереди', summary.versesInQueue)}
            {statCard('Со saved карточками', summary.withSaved)}
            {statCard('Требуют внимания', summary.needAttention)}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                Очередь стихов
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Здесь собраны стихи, по которым система уже накопила кандидатов для обзора.
              </p>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="rounded-[28px] border border-stone-300/70 bg-[#fffaf1] px-5 py-6 text-stone-600 shadow-[0_8px_20px_rgba(94,72,37,0.08)]">
              Пока нет кандидатов в очереди. Когда система начнёт складывать новые карточки в pool,
              они появятся здесь.
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <article
                  key={item.href}
                  className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]"
                >
                  <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Стих
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                          {item.reference}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={item.href}
                          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                        >
                          Открыть review
                        </Link>

                        <button
                          type="button"
                          className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                        >
                          +3
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Curated
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">
                          {item.curatedCount}/12
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Candidates
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">
                          {item.candidateCount}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          New
                        </p>
                        <p className="mt-2 text-xl font-semibold text-stone-900">
                          {item.newCount}
                        </p>
                      </div>

                      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Updated
                        </p>
                        <p className="mt-2 text-base font-medium text-stone-900">
                          {item.updatedLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Sources
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.sources.length > 0 ? (
                          item.sources.map((source) => (
                            <span
                              key={source}
                              className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700"
                            >
                              {sourceLabel(source)}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-stone-600">Источники пока не указаны</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
