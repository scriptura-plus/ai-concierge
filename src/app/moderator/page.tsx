import Link from 'next/link'

export default function ModeratorIndexPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Модератор
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Рабочий кабинет
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Разбирай входящие unfold-сигналы и управляй сохранёнными карточками.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/moderator/unfolds"
            className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)]"
          >
            <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Модератор
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">Входящие unfold</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Разбирай новые unfold-события, скрывай шум и извлекай из них сильные карточки.
              </p>
            </div>
          </Link>

          <Link
            href="/moderator/insights"
            className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)]"
          >
            <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Модератор
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">Сохранённые инсайты</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Просматривай и очищай карточки, которые уже попадают в основной reading layer.
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Домой
          </Link>
        </div>
      </div>
    </main>
  )
}
