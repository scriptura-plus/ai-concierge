import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type UnfoldRow = {
  id: string
  verse_ref: string
  source_mode: 'insights' | 'word' | 'tension' | 'why_this_phrase'
  source_title: string
  source_text: string
  unfold_text: string
  review_status: 'new' | 'reviewed' | 'promoted' | 'hidden'
  created_at: string
}

type FilterMode = 'active' | 'hidden' | 'all'

type PageProps = {
  searchParams?: Promise<{
    filter?: string
  }>
}

function normalizeFilter(value: string | undefined): FilterMode {
  if (value === 'hidden') return 'hidden'
  if (value === 'all') return 'all'
  return 'active'
}

function filterClasses(isActive: boolean) {
  return isActive
    ? 'border-stone-900 bg-stone-900 text-stone-50 shadow-[0_8px_18px_rgba(28,25,23,0.16)]'
    : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
}

function statusPill(status: UnfoldRow['review_status']) {
  if (status === 'promoted') {
    return 'border-emerald-400 bg-emerald-100 text-emerald-900'
  }

  if (status === 'reviewed') {
    return 'border-sky-400 bg-sky-100 text-sky-900'
  }

  if (status === 'hidden') {
    return 'border-stone-400 bg-stone-200 text-stone-700'
  }

  return 'border-amber-400 bg-amber-100 text-amber-900'
}

function statusLabel(status: UnfoldRow['review_status']) {
  if (status === 'promoted') return 'Сохранён'
  if (status === 'reviewed') return 'Просмотрен'
  if (status === 'hidden') return 'Скрыт'
  return 'Новый'
}

function modeLabel(mode: UnfoldRow['source_mode']) {
  if (mode === 'why_this_phrase') return 'Почему эта фраза'
  if (mode === 'word') return 'Слово'
  if (mode === 'tension') return 'Напряжение'
  return 'Инсайты'
}

function truncate(text: string, max = 220) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}…`
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function loadUnfolds(): Promise<UnfoldRow[]> {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('unfold_events')
    .select('id, verse_ref, source_mode, source_title, source_text, unfold_text, review_status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(`Failed to load unfold events: ${error.message}`)
  }

  return (data ?? []) as UnfoldRow[]
}

export default async function ModeratorUnfoldsPage({ searchParams }: PageProps) {
  noStore()

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const filter = normalizeFilter(resolvedSearchParams?.filter)

  let items: UnfoldRow[] = []
  let loadError = ''

  try {
    items = await loadUnfolds()
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Не удалось загрузить unfold-события.'
  }

  const activeItems = items.filter((item) => item.review_status !== 'hidden')
  const hiddenItems = items.filter((item) => item.review_status === 'hidden')
  const promotedItems = items.filter((item) => item.review_status === 'promoted')

  const visibleItems =
    filter === 'hidden' ? hiddenItems : filter === 'all' ? items : activeItems

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Модератор
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Входящие unfold
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Все unfold-события, сохранённые из reading experience.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Домой
          </Link>
        </div>

        <div className="mb-5 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Всего
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{items.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Активные
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{activeItems.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Скрытые
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{hiddenItems.length}</p>
            </div>

            <div className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Сохранённые
              </p>
              <p className="mt-2 text-3xl font-semibold text-stone-900">{promotedItems.length}</p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/moderator/unfolds?filter=active"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filterClasses(
              filter === 'active'
            )}`}
          >
            Активные
          </Link>

          <Link
            href="/moderator/unfolds?filter=hidden"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filterClasses(
              filter === 'hidden'
            )}`}
          >
            Скрытые
          </Link>

          <Link
            href="/moderator/unfolds?filter=all"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${filterClasses(
              filter === 'all'
            )}`}
          >
            Все
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-5 text-red-700">
            {loadError}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-[28px] border border-stone-300/70 bg-[#fffaf1] px-5 py-6 text-stone-600">
            Нет unfold-событий для выбранного фильтра.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleItems.map((item) => (
              <Link
                key={item.id}
                href={`/moderator/unfolds/${item.id}`}
                className="block rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(94,72,37,0.14)] active:scale-[0.998]"
              >
                <article className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(item.review_status)}`}>
                      {statusLabel(item.review_status)}
                    </span>

                    <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1 text-xs font-medium text-stone-700">
                      {modeLabel(item.source_mode)}
                    </span>

                    <span className="text-xs text-stone-500">{formatDate(item.created_at)}</span>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Ссылка
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{item.verse_ref}</h2>
                  </div>

                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Исходный заголовок
                    </p>
                    <p className="mt-1 text-lg font-medium leading-7 text-stone-900">
                      {item.source_title}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Исходный текст
                      </p>
                      <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                        {truncate(item.source_text, 240)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Краткий unfold
                      </p>
                      <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                        {truncate(item.unfold_text, 240)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-xs text-stone-500">ID: {item.id}</p>
                    <span className="text-sm font-medium text-stone-700">Открыть →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
