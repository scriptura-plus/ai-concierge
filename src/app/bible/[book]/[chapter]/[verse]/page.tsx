'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import VerseBlock from './components/VerseBlock'
import LensSheet from './components/LensSheet'
import ContextSheet from './components/ContextSheet'
import CompareView from './components/CompareView'
import ContextView from './components/ContextView'
import CardStackView from './components/CardStackView'
import ModeStateCard from './components/ModeStateCard'
import NarrowContextView from './components/NarrowContextView'
import NarrowContextArticleView from './components/NarrowContextArticleView'
import WordLensView from './components/WordLensView'
import WordLensArticleView from './components/WordLensArticleView'
import PhraseLensView from './components/PhraseLensView'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
    verse: string
  }>
}

type InsightItem = {
  title: string
  text: string
}

type VerseApiResponse = {
  reference?: string
  verseText?: string
  error?: string
}

type InsightsApiResponse = {
  reference?: string
  verseText?: string
  insights?: InsightItem[]
  savedInsights?: InsightItem[]
  generatedInsights?: InsightItem[]
  savedCount?: number
  generatedCount?: number
  count?: number
  error?: string
  raw?: string
}

type TranslateCardApiResponse = {
  targetLanguage?: 'ru' | 'es' | 'fr' | 'de'
  card?: InsightItem
  error?: string
  raw?: string
}

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type UnfoldApiResponse = {
  article?: ArticlePayload
  error?: string
  raw?: string
}

type ComparePoint = {
  title: string
  labelA: string
  quoteA: string
  labelB: string
  quoteB: string
  text: string
}

type ComparePayload = {
  lead: string
  points: ComparePoint[]
  takeaway: string
}

type CompareApiResponse = {
  compare?: ComparePayload
  error?: string
  raw?: string
}

type ContextPoint = {
  title: string
  text: string
}

type ContextPayload = {
  lead: string
  points: ContextPoint[]
  takeaway: string
}

type ContextApiResponse = {
  context?: ContextPayload
  error?: string
  raw?: string
}

type AppLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type ArticleJobStatus = 'idle' | 'generating' | 'ready' | 'failed'
type InsightsStage = 'idle' | 'loading_saved' | 'filling' | 'ready' | 'failed'
type TopTab = 'insights' | 'context' | 'lens'
type LensKind = 'translation' | 'word' | 'tension' | 'phrase'
type ContextKind = 'narrow' | 'wide'
type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type ArticleJob = {
  status: ArticleJobStatus
  article?: ArticlePayload
  error?: string
  title: string
  reference: string
  verseText: string
  language: AppLanguage
  createdAt: number
}

type HighlightKind = 'keyword' | 'phrase' | 'contrast' | 'pivot'

type NarrowContextHighlight = {
  text: string
  kind: HighlightKind
}

type NarrowContextDirection = {
  id: string
  title: string
  summary: string
  why_it_matters: string
  dig_deeper: string
}

type NarrowContextPayload = {
  verseText?: string
  paragraph: {
    reference: string
    full_text: string
    highlights: NarrowContextHighlight[]
  }
  directions: NarrowContextDirection[]
}

type NarrowContextApiResponse = {
  reference?: string
  verseText?: string
  targetLanguage?: AppLanguage
  paragraph?: NarrowContextPayload['paragraph']
  directions?: NarrowContextDirection[]
  error?: string
  raw?: string
}

type NarrowContextArticle = {
  title: string
  lead: string
  body: string[]
  highlight_line?: string
}

type NarrowContextDeepDiveResponse = {
  article?: NarrowContextArticle
  error?: string
  raw?: string
}

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

type WordLensMapApiResponse = {
  reference?: string
  targetLanguage?: AppLanguage
  lead?: string
  nodes?: WordLensNode[]
  error?: string
  raw?: string
}

type WordLensArticle = {
  title: string
  lead: string
  body: string[]
  highlight_line?: string
}

type WordLensArticleApiResponse = {
  reference?: string
  targetLanguage?: AppLanguage
  article?: WordLensArticle
  error?: string
  raw?: string
}

const ARTICLE_STORAGE_KEY = 'scriptura_unfold_articles_v2'

const UI_TEXT: Record<
  AppLanguage,
  {
    back: string
    home: string
    english: string
    spanish: string
    french: string
    german: string
    russian: string
    translating: string

    insights: string
    translations: string
    context: string
    lens: string

    verseLoading: string
    verseLoadingText: string
    verseUnavailable: string
    insightsLoading: string
    insightsLoadingText: string

    loadingInsight: string
    loadingInsightText: string
    unableToLoad: string
    rawModelOutput: string
    noInsight: string
    noInsightText: string

    previous: string
    next: string

    copy: string
    copied: string
    copyFailed: string
    share: string

    unfold: string
    generating: string
    openArticle: string
    articleReady: string

    article: string
    backToCards: string
    copyArticle: string
    shareArticle: string
    articleShared: string
    shareUnavailableArticleCopied: string

    translationsLead: string
    translationsTakeaway: string
    translationsDiffLabel: string

    contextLead: string
    contextTakeaway: string
    contextPointLabel: string
    contextTitle: string
    chooseContextMode: string
    readThisVerseThroughContext: string
    narrowContext: string
    wideContext: string
    narrowHelper: string
    wideHelper: string

    narrowIntroLead: string
    narrowIntroTakeaway: string
    narrowPoint1: string
    narrowPoint2: string
    narrowPoint3: string
    narrowPoint4: string
    narrowPoint5: string
    narrowLoading: string
    narrowLoadingText: string
    narrowUnavailable: string
    paragraphLabel: string
    highlightsLabel: string
    directionsLabel: string
    whyItMattersLabel: string
    digDeeperLabel: string
    backToMeanings: string
    narrowArticleLabel: string
    narrowArticleLoading: string
    narrowArticleLoadingText: string
    narrowArticleUnavailable: string

    lensTitle: string
    chooseFocusedLens: string
    readThisVerseOneAngle: string
    close: string
    change: string

    translation: string
    word: string
    tension: string
    phrase: string

    translationHelper: string
    wordHelper: string
    tensionHelper: string
    phraseHelper: string

    lensPointLabel: string
    takeaway: string

    lensLeadDefault: string
    lensTakeawayDefault: string

    translationsPoint1: string
    translationsPoint2: string
    translationsPoint3: string

    contextPoint1: string
    contextPoint2: string
    contextPoint3: string

    sharedAsImage: string
    sharedAsText: string
    shareUnavailableCopiedInstead: string

    loadingWordLens: string
    loadingWordLensText: string
    wordLensUnavailable: string

    loadingTensionLens: string
    loadingTensionLensText: string
    tensionLensUnavailable: string

    loadingPhraseLens: string
    loadingPhraseLensText: string
    phraseLensUnavailable: string

    loadingTranslations: string
    loadingTranslationsText: string
    translationsUnavailable: string

    loadingContext: string
    loadingContextText: string
    contextUnavailable: string

    backToTop: string
    copiedAnalysis: string
    copyAnalysis: string
    shareAnalysis: string

    tryAgain: string
    lensLabel: string
    preparingModes: string
  }
> = {
  en: {
    back: '← Back',
    home: 'Home',
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    german: 'German',
    russian: 'Russian',
    translating: 'Translating...',
    insights: 'Explorer',
    translations: 'Translations',
    context: 'Context',
    lens: 'Lens',
    verseLoading: 'Loading verse',
    verseLoadingText: 'Preparing the verse text for reading.',
    verseUnavailable: 'Unable to load verse.',
    insightsLoading: 'Loading Explorer',
    insightsLoadingText: 'Preparing the first exploration cards in the background.',
    loadingInsight: 'Loading explorer card',
    loadingInsightText: 'Please wait while the exploration cards are generated.',
    unableToLoad: 'Unable to load',
    rawModelOutput: 'Raw model output',
    noInsight: 'No card',
    noInsightText: 'No explorer card is available for this verse yet.',
    previous: 'Previous',
    next: 'Next',
    copy: 'Copy',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    share: 'Share',
    unfold: 'Unfold',
    generating: 'Generating...',
    openArticle: 'Open article',
    articleReady: 'Article ready',
    article: 'Article',
    backToCards: 'Back to cards',
    copyArticle: 'Copy article',
    shareArticle: 'Share article',
    articleShared: 'Article shared',
    shareUnavailableArticleCopied: 'Share unavailable — article copied',
    translationsLead:
      'This mode will compare translation choices and surface where wording moves the reader’s attention in different directions.',
    translationsTakeaway:
      'Translations should feel like a reading tool, not a raw list of versions.',
    translationsDiffLabel: 'Difference',
    contextLead:
      'Context helps the verse open through the most meaningful surrounding frame.',
    contextTakeaway:
      'The best context is not the biggest one, but the one that most honestly sharpens the verse.',
    contextPointLabel: 'Context point',
    contextTitle: 'Context',
    chooseContextMode: 'Choose a context mode',
    readThisVerseThroughContext: 'Read this verse through the closest or wider frame.',
    narrowContext: 'Narrow Context',
    wideContext: 'Wide Context',
    narrowHelper: 'Closest paragraph, hidden meaning-lines, and directions to explore',
    wideHelper: 'Chapter, book, and — when meaningful — the wider Bible line',
    narrowIntroLead:
      'Narrow Context reads the verse inside the smallest meaningful paragraph around it and looks for the deepest pressure lines inside that local block.',
    narrowIntroTakeaway:
      'The goal is not more information, but a cleaner reading unit with real doors into deeper thought.',
    narrowPoint1:
      'The full paragraph is shown first as the primary reading object, not as background noise.',
    narrowPoint2:
      'The most meaningful words and phrases are softly highlighted inside the paragraph itself.',
    narrowPoint3:
      'The system then identifies up to five promising directions that rise from the paragraph.',
    narrowPoint4:
      'Each direction explains why it matters and where deeper reading can go next.',
    narrowPoint5:
      'A tap opens a short article that deepens one chosen direction without drifting into a different angle.',
    narrowLoading: 'Loading Narrow Context',
    narrowLoadingText:
      'Finding the smallest meaningful paragraph and tracing its hidden pressure points…',
    narrowUnavailable: 'Unable to load Narrow Context.',
    paragraphLabel: 'Paragraph',
    highlightsLabel: 'Meaning levers',
    directionsLabel: 'Directions',
    whyItMattersLabel: 'Why this matters',
    digDeeperLabel: 'Dig deeper',
    backToMeanings: 'Back to meanings',
    narrowArticleLabel: 'Deep dive',
    narrowArticleLoading: 'Loading deep dive',
    narrowArticleLoadingText:
      'Deepening the selected direction into a short article…',
    narrowArticleUnavailable: 'Unable to load deep dive.',
    lensTitle: 'Lens',
    chooseFocusedLens: 'Choose a focused lens',
    readThisVerseOneAngle: 'Read this verse through one angle.',
    close: 'Close',
    change: 'Change',
    translation: 'Translation',
    word: 'Word',
    tension: 'Tension',
    phrase: 'Why This Phrase',
    translationHelper: 'How translation shifts emphasis',
    wordHelper: 'Hidden weight of words',
    tensionHelper: 'What’s surprising here',
    phraseHelper: 'Why it is said this way',
    lensPointLabel: 'Lens point',
    takeaway: 'Takeaway',
    lensLeadDefault: 'Choose a focused lens to read this verse through one angle.',
    lensTakeawayDefault: 'Lens is the focused-reading family, not just a reroll button.',
    translationsPoint1: 'A short lead will name the main translation tension in the verse.',
    translationsPoint2:
      'The final version will show 3–5 compact comparison points instead of one dense block.',
    translationsPoint3:
      'A short takeaway will explain why those differences matter for reading the verse.',
    contextPoint1:
      'Narrow Context focuses on the closest paragraph and its hidden pressure points.',
    contextPoint2:
      'Wide Context looks for the most meaningful larger frame: chapter, book, or wider Bible line.',
    contextPoint3:
      'The system should choose the most useful scale honestly, without forcing grand claims.',
    sharedAsImage: 'Shared as image',
    sharedAsText: 'Shared as text',
    shareUnavailableCopiedInstead: 'Share unavailable — copied instead',
    loadingWordLens: 'Loading Word lens',
    loadingWordLensText: 'Reading the verse through the hidden weight of its words…',
    wordLensUnavailable: 'Unable to load Word lens.',
    loadingTensionLens: 'Loading Tension lens',
    loadingTensionLensText:
      'Reading the verse through its pressure points, contrasts, and surprises…',
    tensionLensUnavailable: 'Unable to load Tension lens.',
    loadingPhraseLens: 'Loading Why This Phrase lens',
    loadingPhraseLensText: 'Reading the verse through the force of its exact phrasing…',
    phraseLensUnavailable: 'Unable to load Why This Phrase lens.',
    loadingTranslations: 'Loading Translations mode',
    loadingTranslationsText:
      'Comparing translation pressure, wording choices, and shifts in emphasis…',
    translationsUnavailable: 'Unable to load Translations mode.',
    loadingContext: 'Loading Context mode',
    loadingContextText:
      'Tracing the wider frame that most honestly sharpens the verse…',
    contextUnavailable: 'Unable to load Context mode.',
    backToTop: 'Top',
    copiedAnalysis: 'Copied',
    copyAnalysis: 'Copy',
    shareAnalysis: 'Share',
    tryAgain: 'Try again',
    lensLabel: 'Lens',
    preparingModes: 'Preparing other modes...',
  },
  ru: {
    back: '← Назад',
    home: 'Главная',
    english: 'Английский',
    spanish: 'Испанский',
    french: 'Французский',
    german: 'Немецкий',
    russian: 'Русский',
    translating: 'Перевод...',
    insights: 'Исследование',
    translations: 'Переводы',
    context: 'Контекст',
    lens: 'Линза',
    verseLoading: 'Загрузка стиха',
    verseLoadingText: 'Подготавливаем текст стиха для чтения.',
    verseUnavailable: 'Не удалось загрузить стих.',
    insightsLoading: 'Загрузка исследования',
    insightsLoadingText: 'Подбираем первые карточки исследования в фоне.',
    loadingInsight: 'Загрузка карточки',
    loadingInsightText: 'Подождите, пока генерируются карточки исследования.',
    unableToLoad: 'Не удалось загрузить',
    rawModelOutput: 'Сырой вывод модели',
    noInsight: 'Нет карточки',
    noInsightText: 'Для этого стиха пока нет доступной карточки исследования.',
    previous: 'Назад',
    next: 'Далее',
    copy: 'Копировать',
    copied: 'Скопировано',
    copyFailed: 'Ошибка копирования',
    share: 'Поделиться',
    unfold: 'Развернуть',
    generating: 'Генерация...',
    openArticle: 'Открыть статью',
    articleReady: 'Статья готова',
    article: 'Статья',
    backToCards: 'Назад к карточкам',
    copyArticle: 'Копировать статью',
    shareArticle: 'Поделиться статьёй',
    articleShared: 'Статья отправлена',
    shareUnavailableArticleCopied: 'Поделиться нельзя — статья скопирована',
    translationsLead:
      'Этот режим будет сравнивать переводческие решения и показывать, как формулировка направляет внимание читателя в разные стороны.',
    translationsTakeaway:
      '«Переводы» должны ощущаться как инструмент чтения, а не как сырой список версий.',
    translationsDiffLabel: 'Различие',
    contextLead:
      'Контекст раскрывает стих через наиболее плодотворную окружающую рамку.',
    contextTakeaway:
      'Лучший контекст — не самый большой, а тот, который честнее всего заостряет стих.',
    contextPointLabel: 'Пункт контекста',
    contextTitle: 'Контекст',
    chooseContextMode: 'Выберите режим контекста',
    readThisVerseThroughContext: 'Посмотрите на стих через ближайшую или более широкую рамку.',
    narrowContext: 'Узкий контекст',
    wideContext: 'Широкий контекст',
    narrowHelper: 'Ближайший абзац, скрытые линии смысла и направления для исследования',
    wideHelper: 'Глава, книга и — если уместно — более широкая линия всей Библии',
    narrowIntroLead:
      'Узкий контекст читает стих внутри наименьшего смыслового абзаца вокруг него и ищет глубинные линии значения внутри этого локального блока.',
    narrowIntroTakeaway:
      'Цель здесь не просто дать больше информации, а показать более точный блок чтения и настоящие двери для углубления.',
    narrowPoint1:
      'Сначала показывается полный абзац как главный объект чтения, а не как второстепенный фон.',
    narrowPoint2:
      'Затем внутри самого абзаца мягко выделяются самые смыслонагруженные слова и фразы.',
    narrowPoint3:
      'После этого система находит до пяти перспективных направлений, которые реально вырастают из абзаца.',
    narrowPoint4:
      'Каждое направление объясняет, почему оно важно и куда по нему можно копать дальше.',
    narrowPoint5:
      'Нажатие открывает короткую статью, которая углубляет выбранное направление и не расплывается в другую тему.',
    narrowLoading: 'Загрузка узкого контекста',
    narrowLoadingText:
      'Ищем наименьший смысловой абзац и его скрытые линии давления…',
    narrowUnavailable: 'Не удалось загрузить узкий контекст.',
    paragraphLabel: 'Абзац',
    highlightsLabel: 'Смысловые рычаги',
    directionsLabel: 'Направления',
    whyItMattersLabel: 'Почему это важно',
    digDeeperLabel: 'Куда копать',
    backToMeanings: 'Назад к смыслам',
    narrowArticleLabel: 'Углубление',
    narrowArticleLoading: 'Загрузка углубления',
    narrowArticleLoadingText:
      'Превращаем выбранное направление в короткую статью…',
    narrowArticleUnavailable: 'Не удалось загрузить углубление.',
    lensTitle: 'Линза',
    chooseFocusedLens: 'Выберите сфокусированную линзу',
    readThisVerseOneAngle: 'Посмотрите на этот стих под одним углом.',
    close: 'Закрыть',
    change: 'Изменить',
    translation: 'Перевод',
    word: 'Слово',
    tension: 'Напряжение',
    phrase: 'Почему именно эта фраза',
    translationHelper: 'Как перевод меняет акцент',
    wordHelper: 'Скрытый вес слов',
    tensionHelper: 'Что здесь неожиданно',
    phraseHelper: 'Почему это сказано именно так',
    lensPointLabel: 'Пункт линзы',
    takeaway: 'Вывод',
    lensLeadDefault:
      'Выберите сфокусированную линзу, чтобы посмотреть на этот стих под одним углом.',
    lensTakeawayDefault:
      '«Линза» — это семейство сфокусированного чтения, а не просто кнопка reroll.',
    translationsPoint1:
      'Короткий lead будет называть главное переводческое напряжение в стихе.',
    translationsPoint2:
      'Финальная версия покажет 3–5 компактных различий вместо одного плотного блока.',
    translationsPoint3:
      'Короткий вывод объяснит, почему эти различия важны для чтения стиха.',
    contextPoint1:
      'Узкий контекст фокусируется на ближайшем абзаце и его скрытых точках давления.',
    contextPoint2:
      'Широкий контекст ищет наиболее полезную большую рамку: глава, книга или широкая библейская линия.',
    contextPoint3:
      'Система должна честно выбирать самый полезный масштаб и не натягивать грандиозные выводы.',
    sharedAsImage: 'Отправлено как изображение',
    sharedAsText: 'Отправлено как текст',
    shareUnavailableCopiedInstead: 'Поделиться нельзя — текст скопирован',
    loadingWordLens: 'Загрузка линзы «Слово»',
    loadingWordLensText: 'Смотрим на стих через скрытый вес его слов…',
    wordLensUnavailable: 'Не удалось загрузить линзу «Слово».',
    loadingTensionLens: 'Загрузка линзы «Напряжение»',
    loadingTensionLensText:
      'Смотрим на стих через его точки напряжения, контрасты и неожиданные повороты…',
    tensionLensUnavailable: 'Не удалось загрузить линзу «Напряжение».',
    loadingPhraseLens: 'Загрузка линзы «Почему именно эта фраза»',
    loadingPhraseLensText: 'Смотрим на стих через силу его точной формулировки…',
    phraseLensUnavailable: 'Не удалось загрузить линзу «Почему именно эта фраза».',
    loadingTranslations: 'Загрузка режима «Переводы»',
    loadingTranslationsText:
      'Сравниваем переводческое давление, выбор формулировок и сдвиги акцента…',
    translationsUnavailable: 'Не удалось загрузить режим «Переводы».',
    loadingContext: 'Загрузка режима «Контекст»',
    loadingContextText:
      'Ищем более широкую рамку, которая честнее всего заостряет смысл стиха…',
    contextUnavailable: 'Не удалось загрузить режим «Контекст».',
    backToTop: 'Наверх',
    copiedAnalysis: 'Скопировано',
    copyAnalysis: 'Копировать',
    shareAnalysis: 'Поделиться',
    tryAgain: 'Попробовать снова',
    lensLabel: 'Линза',
    preparingModes: 'Подготавливаем остальные режимы...',
  },
  es: {
    back: '← Atrás',
    home: 'Inicio',
    english: 'Inglés',
    spanish: 'Español',
    french: 'Francés',
    german: 'Alemán',
    russian: 'Ruso',
    translating: 'Traduciendo...',
    insights: 'Exploración',
    translations: 'Traducciones',
    context: 'Contexto',
    lens: 'Lente',
    verseLoading: 'Cargando versículo',
    verseLoadingText: 'Preparando el texto del versículo para leerlo.',
    verseUnavailable: 'No se pudo cargar el versículo.',
    insightsLoading: 'Cargando exploración',
    insightsLoadingText: 'Generando en segundo plano las primeras tarjetas de exploración.',
    loadingInsight: 'Cargando tarjeta',
    loadingInsightText: 'Espera mientras se generan las tarjetas de exploración.',
    unableToLoad: 'No se pudo cargar',
    rawModelOutput: 'Salida bruta del modelo',
    noInsight: 'Sin tarjeta',
    noInsightText: 'Todavía no hay una tarjeta de exploración para este versículo.',
    previous: 'Anterior',
    next: 'Siguiente',
    copy: 'Copiar',
    copied: 'Copiado',
    copyFailed: 'Error al copiar',
    share: 'Compartir',
    unfold: 'Desarrollar',
    generating: 'Generando...',
    openArticle: 'Abrir artículo',
    articleReady: 'Artículo listo',
    article: 'Artículo',
    backToCards: 'Volver a tarjetas',
    copyArticle: 'Copiar artículo',
    shareArticle: 'Compartir artículo',
    articleShared: 'Artículo compartido',
    shareUnavailableArticleCopied: 'No se puede compartir — artículo copiado',
    translationsLead:
      'Este modo comparará decisiones de traducción y mostrará cómo la redacción dirige la atención del lector en distintas direcciones.',
    translationsTakeaway:
      'Traducciones debe sentirse como una herramienta de lectura, no como una lista bruta de versiones.',
    translationsDiffLabel: 'Diferencia',
    contextLead:
      'El contexto abre el versículo a través del marco circundante más útil.',
    contextTakeaway:
      'El mejor contexto no es el más grande, sino el que afina el versículo con más honestidad.',
    contextPointLabel: 'Punto de contexto',
    contextTitle: 'Contexto',
    chooseContextMode: 'Elige un modo de contexto',
    readThisVerseThroughContext: 'Lee este versículo desde el marco más cercano o más amplio.',
    narrowContext: 'Contexto cercano',
    wideContext: 'Contexto amplio',
    narrowHelper: 'El párrafo más cercano, líneas ocultas de sentido y rutas para explorar',
    wideHelper: 'Capítulo, libro y — cuando tenga sentido — la línea más amplia de la Biblia',
    narrowIntroLead:
      'El contexto cercano lee el versículo dentro del párrafo significativo más pequeño que lo rodea y busca sus líneas de presión internas.',
    narrowIntroTakeaway:
      'El objetivo no es dar más información, sino un bloque de lectura más preciso y puertas reales hacia una lectura más profunda.',
    narrowPoint1: 'Primero se muestra el párrafo completo como objeto principal de lectura.',
    narrowPoint2:
      'Luego se resaltan suavemente dentro del mismo párrafo las palabras y frases con mayor peso.',
    narrowPoint3:
      'Después el sistema identifica hasta cinco direcciones prometedoras que nacen del párrafo.',
    narrowPoint4:
      'Cada dirección explica por qué importa y hacia dónde puede profundizarse.',
    narrowPoint5:
      'Al tocarla, se abre un artículo breve que profundiza la dirección elegida sin desviarse.',
    narrowLoading: 'Cargando contexto cercano',
    narrowLoadingText:
      'Buscando el párrafo significativo más pequeño y sus líneas de presión ocultas…',
    narrowUnavailable: 'No se pudo cargar el contexto cercano.',
    paragraphLabel: 'Párrafo',
    highlightsLabel: 'Palancas de sentido',
    directionsLabel: 'Direcciones',
    whyItMattersLabel: 'Por qué importa',
    digDeeperLabel: 'Profundizar',
    backToMeanings: 'Volver a sentidos',
    narrowArticleLabel: 'Profundización',
    narrowArticleLoading: 'Cargando profundización',
    narrowArticleLoadingText: 'Desarrollando la dirección elegida en un artículo breve…',
    narrowArticleUnavailable: 'No se pudo cargar la profundización.',
    lensTitle: 'Lente',
    chooseFocusedLens: 'Elige una lente enfocada',
    readThisVerseOneAngle: 'Lee este versículo desde un solo ángulo.',
    close: 'Cerrar',
    change: 'Cambiar',
    translation: 'Traducción',
    word: 'Palabra',
    tension: 'Tensión',
    phrase: 'Por qué esta frase',
    translationHelper: 'Cómo la traducción mueve el énfasis',
    wordHelper: 'Peso oculto de las palabras',
    tensionHelper: 'Qué sorprende aquí',
    phraseHelper: 'Por qué se dice así',
    lensPointLabel: 'Punto de lente',
    takeaway: 'Conclusión',
    lensLeadDefault:
      'Elige una lente enfocada para leer este versículo desde un solo ángulo.',
    lensTakeawayDefault: 'Lente es la familia de lectura enfocada, no solo un botón de repetir.',
    translationsPoint1:
      'Un lead breve nombrará la tensión principal de traducción en el versículo.',
    translationsPoint2:
      'La versión final mostrará 3–5 puntos de comparación compactos en vez de un bloque denso.',
    translationsPoint3:
      'Una conclusión breve explicará por qué esas diferencias importan para leer el versículo.',
    contextPoint1:
      'El contexto cercano se enfoca en el párrafo inmediato y sus puntos de presión ocultos.',
    contextPoint2:
      'El contexto amplio busca el marco mayor más útil: capítulo, libro o línea bíblica más amplia.',
    contextPoint3:
      'El sistema debe elegir con honestidad la escala más útil y no forzar conclusiones grandiosas.',
    sharedAsImage: 'Compartido como imagen',
    sharedAsText: 'Compartido como texto',
    shareUnavailableCopiedInstead: 'No se puede compartir — copiado en su lugar',
    loadingWordLens: 'Cargando lente Palabra',
    loadingWordLensText: 'Leyendo el versículo a través del peso oculto de sus palabras…',
    wordLensUnavailable: 'No se pudo cargar la lente Palabra.',
    loadingTensionLens: 'Cargando lente Tensión',
    loadingTensionLensText:
      'Leyendo el versículo a través de sus tensiones, contrastes y sorpresas…',
    tensionLensUnavailable: 'No se pudo cargar la lente Tensión.',
    loadingPhraseLens: 'Cargando lente Por qué esta frase',
    loadingPhraseLensText:
      'Leyendo el versículo a través de la fuerza de su formulación exacta…',
    phraseLensUnavailable: 'No se pudo cargar la lente Por qué esta frase.',
    loadingTranslations: 'Cargando modo Traducciones',
    loadingTranslationsText:
      'Comparando presión de traducción, elecciones de redacción y cambios de énfasis…',
    translationsUnavailable: 'No se pudo cargar el modo Traducciones.',
    loadingContext: 'Cargando modo Contexto',
    loadingContextText:
      'Buscando el marco más amplio que afine este versículo con honestidad…',
    contextUnavailable: 'No se pudo cargar el modo Contexto.',
    backToTop: 'Arriba',
    copiedAnalysis: 'Copiado',
    copyAnalysis: 'Copiar',
    shareAnalysis: 'Compartir',
    tryAgain: 'Intentar de nuevo',
    lensLabel: 'Lente',
    preparingModes: 'Preparando otros modos...',
  },
  fr: {
    back: '← Retour',
    home: 'Accueil',
    english: 'Anglais',
    spanish: 'Espagnol',
    french: 'Français',
    german: 'Allemand',
    russian: 'Russe',
    translating: 'Traduction...',
    insights: 'Exploration',
    translations: 'Traductions',
    context: 'Contexte',
    lens: 'Lentille',
    verseLoading: 'Chargement du verset',
    verseLoadingText: 'Préparation du texte du verset pour la lecture.',
    verseUnavailable: 'Impossible de charger le verset.',
    insightsLoading: 'Chargement de l’exploration',
    insightsLoadingText: 'Génération en arrière-plan des premières cartes d’exploration.',
    loadingInsight: 'Chargement de la carte',
    loadingInsightText: 'Veuillez patienter pendant la génération des cartes d’exploration.',
    unableToLoad: 'Impossible de charger',
    rawModelOutput: 'Sortie brute du modèle',
    noInsight: 'Aucune carte',
    noInsightText: 'Aucune carte d’exploration n’est disponible pour ce verset.',
    previous: 'Précédent',
    next: 'Suivant',
    copy: 'Copier',
    copied: 'Copié',
    copyFailed: 'Échec de copie',
    share: 'Partager',
    unfold: 'Déplier',
    generating: 'Génération...',
    openArticle: 'Ouvrir l’article',
    articleReady: 'Article prêt',
    article: 'Article',
    backToCards: 'Retour aux cartes',
    copyArticle: 'Copier l’article',
    shareArticle: 'Partager l’article',
    articleShared: 'Article partagé',
    shareUnavailableArticleCopied: 'Partage indisponible — article copié',
    translationsLead:
      'Ce mode comparera les choix de traduction et montrera comment la formulation déplace l’attention du lecteur.',
    translationsTakeaway:
      'Traductions doit ressembler à un outil de lecture, pas à une simple liste brute.',
    translationsDiffLabel: 'Différence',
    contextLead:
      'Le contexte ouvre le verset à travers le cadre environnant le plus utile.',
    contextTakeaway:
      'Le meilleur contexte n’est pas le plus grand, mais celui qui affine le verset avec le plus d’honnêteté.',
    contextPointLabel: 'Point de contexte',
    contextTitle: 'Contexte',
    chooseContextMode: 'Choisissez un mode de contexte',
    readThisVerseThroughContext: 'Lisez ce verset dans son cadre proche ou plus large.',
    narrowContext: 'Contexte proche',
    wideContext: 'Contexte large',
    narrowHelper: 'Le paragraphe le plus proche, les lignes de sens cachées et des pistes à explorer',
    wideHelper:
      'Chapitre, livre et — lorsque cela éclaire vraiment — la ligne plus large de la Bible',
    narrowIntroLead:
      'Le contexte proche lit le verset dans le plus petit paragraphe significatif qui l’entoure et cherche ses lignes de pression internes.',
    narrowIntroTakeaway:
      'Le but n’est pas d’ajouter de l’information, mais d’offrir une unité de lecture plus juste et de vraies portes vers la profondeur.',
    narrowPoint1:
      'Le paragraphe complet est d’abord montré comme objet principal de lecture.',
    narrowPoint2:
      'Les mots et expressions les plus porteurs sont ensuite mis en valeur à l’intérieur du paragraphe.',
    narrowPoint3:
      'Puis le système identifie jusqu’à cinq directions prometteuses qui naissent du paragraphe.',
    narrowPoint4:
      'Chaque direction explique pourquoi elle compte et comment aller plus loin.',
    narrowPoint5:
      'Un toucher ouvre un court article qui approfondit cet angle sans partir ailleurs.',
    narrowLoading: 'Chargement du contexte proche',
    narrowLoadingText:
      'Recherche du plus petit paragraphe significatif et de ses lignes de pression cachées…',
    narrowUnavailable: 'Impossible de charger le contexte proche.',
    paragraphLabel: 'Paragraphe',
    highlightsLabel: 'Leviers de sens',
    directionsLabel: 'Directions',
    whyItMattersLabel: 'Pourquoi cela compte',
    digDeeperLabel: 'Creuser plus loin',
    backToMeanings: 'Retour aux sens',
    narrowArticleLabel: 'Approfondissement',
    narrowArticleLoading: 'Chargement de l’approfondissement',
    narrowArticleLoadingText:
      'Développement de la direction choisie en un court article…',
    narrowArticleUnavailable: 'Impossible de charger l’approfondissement.',
    lensTitle: 'Lentille',
    chooseFocusedLens: 'Choisissez une lentille ciblée',
    readThisVerseOneAngle: 'Lisez ce verset sous un angle précis.',
    close: 'Fermer',
    change: 'Changer',
    translation: 'Traduction',
    word: 'Mot',
    tension: 'Tension',
    phrase: 'Pourquoi cette phrase',
    translationHelper: 'Comment la traduction déplace l’accent',
    wordHelper: 'Poids caché des mots',
    tensionHelper: 'Ce qui surprend ici',
    phraseHelper: 'Pourquoi c’est dit ainsi',
    lensPointLabel: 'Point de lentille',
    takeaway: 'Conclusion',
    lensLeadDefault: 'Choisissez une lentille ciblée pour lire ce verset sous un angle précis.',
    lensTakeawayDefault: 'La lentille est une famille de lecture ciblée, pas juste un reroll.',
    translationsPoint1: 'Un court lead nommera la tension principale de traduction.',
    translationsPoint2:
      'La version finale montrera 3–5 points compacts au lieu d’un bloc dense.',
    translationsPoint3:
      'Une courte conclusion expliquera pourquoi ces différences comptent.',
    contextPoint1:
      'Le contexte proche se concentre sur le paragraphe immédiat et ses points de pression cachés.',
    contextPoint2:
      'Le contexte large cherche le cadre le plus utile : chapitre, livre ou ligne biblique plus vaste.',
    contextPoint3:
      'Le système doit choisir honnêtement l’échelle la plus féconde sans forcer de grandes conclusions.',
    sharedAsImage: 'Partagé comme image',
    sharedAsText: 'Partagé comme texte',
    shareUnavailableCopiedInstead: 'Partage indisponible — copié à la place',
    loadingWordLens: 'Chargement de la lentille Mot',
    loadingWordLensText: 'Lecture du verset à travers le poids caché de ses mots…',
    wordLensUnavailable: 'Impossible de charger la lentille Mot.',
    loadingTensionLens: 'Chargement de la lentille Tension',
    loadingTensionLensText:
      'Lecture du verset à travers ses tensions, contrastes et surprises…',
    tensionLensUnavailable: 'Impossible de charger la lentille Tension.',
    loadingPhraseLens: 'Chargement de la lentille Pourquoi cette phrase',
    loadingPhraseLensText:
      'Lecture du verset à travers la force de sa formulation exacte…',
    phraseLensUnavailable: 'Impossible de charger la lentille Pourquoi cette phrase.',
    loadingTranslations: 'Chargement du mode Traductions',
    loadingTranslationsText:
      'Comparaison de la pression de traduction, des choix de formulation et des déplacements d’accent…',
    translationsUnavailable: 'Impossible de charger le mode Traductions.',
    loadingContext: 'Chargement du mode Contexte',
    loadingContextText:
      'Recherche du cadre le plus large qui affûte honnêtement ce verset…',
    contextUnavailable: 'Impossible de charger le mode Contexte.',
    backToTop: 'Haut',
    copiedAnalysis: 'Copié',
    copyAnalysis: 'Copier',
    shareAnalysis: 'Partager',
    tryAgain: 'Réessayer',
    lensLabel: 'Lentille',
    preparingModes: 'Préparation des autres modes...',
  },
  de: {
    back: '← Zurück',
    home: 'Startseite',
    english: 'Englisch',
    spanish: 'Spanisch',
    french: 'Französisch',
    german: 'Deutsch',
    russian: 'Russisch',
    translating: 'Übersetzung...',
    insights: 'Erkundung',
    translations: 'Übersetzungen',
    context: 'Kontext',
    lens: 'Linse',
    verseLoading: 'Vers wird geladen',
    verseLoadingText: 'Der Verstext wird zum Lesen vorbereitet.',
    verseUnavailable: 'Vers konnte nicht geladen werden.',
    insightsLoading: 'Erkundung wird geladen',
    insightsLoadingText: 'Die ersten Erkundungskarten werden im Hintergrund erstellt.',
    loadingInsight: 'Karte wird geladen',
    loadingInsightText: 'Bitte warten, während die Erkundungskarten erzeugt werden.',
    unableToLoad: 'Konnte nicht geladen werden',
    rawModelOutput: 'Rohausgabe des Modells',
    noInsight: 'Keine Karte',
    noInsightText: 'Für diesen Vers ist noch keine Erkundungskarte verfügbar.',
    previous: 'Zurück',
    next: 'Weiter',
    copy: 'Kopieren',
    copied: 'Kopiert',
    copyFailed: 'Kopieren fehlgeschlagen',
    share: 'Teilen',
    unfold: 'Entfalten',
    generating: 'Wird erzeugt...',
    openArticle: 'Artikel öffnen',
    articleReady: 'Artikel bereit',
    article: 'Artikel',
    backToCards: 'Zurück zu Karten',
    copyArticle: 'Artikel kopieren',
    shareArticle: 'Artikel teilen',
    articleShared: 'Artikel geteilt',
    shareUnavailableArticleCopied: 'Teilen nicht verfügbar — Artikel kopiert',
    translationsLead:
      'Dieser Modus vergleicht Übersetzungsentscheidungen und zeigt, wie Formulierungen die Aufmerksamkeit verschieben.',
    translationsTakeaway:
      'Übersetzungen sollte sich wie ein Lesewerkzeug anfühlen, nicht wie eine rohe Liste.',
    translationsDiffLabel: 'Unterschied',
    contextLead:
      'Der Kontext öffnet den Vers durch den nützlichsten größeren Rahmen.',
    contextTakeaway:
      'Der beste Kontext ist nicht der größte, sondern der, der den Vers am ehrlichsten schärft.',
    contextPointLabel: 'Kontextpunkt',
    contextTitle: 'Kontext',
    chooseContextMode: 'Wähle einen Kontextmodus',
    readThisVerseThroughContext: 'Lies diesen Vers im nahen oder weiteren Rahmen.',
    narrowContext: 'Naher Kontext',
    wideContext: 'Weiter Kontext',
    narrowHelper: 'Der nächste Absatz, verborgene Sinnlinien und Wege zum Weitergraben',
    wideHelper:
      'Kapitel, Buch und — wenn es wirklich trägt — die weitere biblische Linie',
    narrowIntroLead:
      'Der nahe Kontext liest den Vers im kleinsten sinnvollen Absatz um ihn herum und sucht seine inneren Drucklinien.',
    narrowIntroTakeaway:
      'Das Ziel ist nicht mehr Information, sondern eine genauere Leseeinheit und echte Wege zur Vertiefung.',
    narrowPoint1:
      'Zuerst wird der ganze Absatz als eigentliches Leseobjekt gezeigt.',
    narrowPoint2:
      'Dann werden die bedeutungstragenden Wörter und Wendungen im Absatz selbst sanft markiert.',
    narrowPoint3:
      'Danach identifiziert das System bis zu fünf vielversprechende Richtungen, die aus dem Absatz wachsen.',
    narrowPoint4:
      'Jede Richtung erklärt, warum sie zählt und wohin man weitergraben kann.',
    narrowPoint5:
      'Ein Tippen öffnet einen kurzen Text, der genau diese Richtung vertieft, ohne abzuweichen.',
    narrowLoading: 'Naher Kontext wird geladen',
    narrowLoadingText:
      'Der kleinste sinnvolle Absatz und seine verborgenen Drucklinien werden gesucht…',
    narrowUnavailable: 'Naher Kontext konnte nicht geladen werden.',
    paragraphLabel: 'Absatz',
    highlightsLabel: 'Sinnhebel',
    directionsLabel: 'Richtungen',
    whyItMattersLabel: 'Warum das zählt',
    digDeeperLabel: 'Weiter graben',
    backToMeanings: 'Zurück zu Bedeutungen',
    narrowArticleLabel: 'Vertiefung',
    narrowArticleLoading: 'Vertiefung wird geladen',
    narrowArticleLoadingText:
      'Die gewählte Richtung wird zu einem kurzen Text ausgearbeitet…',
    narrowArticleUnavailable: 'Vertiefung konnte nicht geladen werden.',
    lensTitle: 'Linse',
    chooseFocusedLens: 'Wähle eine fokussierte Linse',
    readThisVerseOneAngle: 'Lies diesen Vers aus einem bestimmten Blickwinkel.',
    close: 'Schließen',
    change: 'Ändern',
    translation: 'Übersetzung',
    word: 'Wort',
    tension: 'Spannung',
    phrase: 'Warum diese Formulierung',
    translationHelper: 'Wie Übersetzung den Akzent verschiebt',
    wordHelper: 'Verstecktes Gewicht der Wörter',
    tensionHelper: 'Was hier überrascht',
    phraseHelper: 'Warum es so gesagt wird',
    lensPointLabel: 'Linsenpunkt',
    takeaway: 'Fazit',
    lensLeadDefault: 'Wähle eine fokussierte Linse, um diesen Vers aus einem Blickwinkel zu lesen.',
    lensTakeawayDefault: 'Die Linse ist eine fokussierte Lesefamilie, nicht nur ein Reroll.',
    translationsPoint1:
      'Ein kurzer Lead benennt die wichtigste Übersetzungsspannung im Vers.',
    translationsPoint2:
      'Die endgültige Version zeigt 3–5 kompakte Vergleichspunkte statt eines dichten Blocks.',
    translationsPoint3:
      'Ein kurzes Fazit erklärt, warum diese Unterschiede für die Lesart wichtig sind.',
    contextPoint1:
      'Der nahe Kontext konzentriert sich auf den unmittelbaren Absatz und seine verborgenen Druckpunkte.',
    contextPoint2:
      'Der weite Kontext sucht den fruchtbarsten größeren Rahmen: Kapitel, Buch oder weitere biblische Linie.',
    contextPoint3:
      'Das System soll die nützlichste Ebene ehrlich wählen und keine großen Aussagen erzwingen.',
    sharedAsImage: 'Als Bild geteilt',
    sharedAsText: 'Als Text geteilt',
    shareUnavailableCopiedInstead: 'Teilen nicht verfügbar — stattdessen kopiert',
    loadingWordLens: 'Wort-Linse wird geladen',
    loadingWordLensText: 'Der Vers wird durch das verborgene Gewicht seiner Wörter gelesen…',
    wordLensUnavailable: 'Wort-Linse konnte nicht geladen werden.',
    loadingTensionLens: 'Spannungs-Linse wird geladen',
    loadingTensionLensText:
      'Der Vers wird durch seine Spannungspunkte, Kontraste und Überraschungen gelesen…',
    tensionLensUnavailable: 'Spannungs-Linse konnte nicht geladen werden.',
    loadingPhraseLens: 'Linse Warum diese Formulierung wird geladen',
    loadingPhraseLensText:
      'Der Vers wird durch die Kraft seiner genauen Formulierung gelesen…',
    phraseLensUnavailable: 'Linse Warum diese Formulierung konnte nicht geladen werden.',
    loadingTranslations: 'Übersetzungsmodus wird geladen',
    loadingTranslationsText:
      'Übersetzungsdruck, Formulierungswahl und Akzentverschiebungen werden verglichen…',
    translationsUnavailable: 'Übersetzungsmodus konnte nicht geladen werden.',
    loadingContext: 'Kontextmodus wird geladen',
    loadingContextText:
      'Der größere Rahmen wird gesucht, der den Vers am ehrlichsten schärft…',
    contextUnavailable: 'Kontextmodus konnte nicht geladen werden.',
    backToTop: 'Oben',
    copiedAnalysis: 'Kopiert',
    copyAnalysis: 'Kopieren',
    shareAnalysis: 'Teilen',
    tryAgain: 'Erneut versuchen',
    lensLabel: 'Linse',
    preparingModes: 'Andere Modi werden vorbereitet...',
  },
}

function emptyLensMap(): Record<AppLanguage, InsightItem[]> {
  return { en: [], ru: [], es: [], fr: [], de: [] }
}

function emptyCompareMap(): Record<AppLanguage, ComparePayload | null> {
  return { en: null, ru: null, es: null, fr: null, de: null }
}

function emptyContextMap(): Record<AppLanguage, ContextPayload | null> {
  return { en: null, ru: null, es: null, fr: null, de: null }
}

function emptyWordLensMap(): Record<AppLanguage, WordLensPayload | null> {
  return { en: null, ru: null, es: null, fr: null, de: null }
}

function emptyWordLensArticleMap(): Record<AppLanguage, WordLensArticle | null> {
  return { en: null, ru: null, es: null, fr: null, de: null }
}

function formatBookLabel(bookSlug: string) {
  return bookSlug
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function renderStructuredPanel(
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

function lensBadgeLabel(
  selectedLens: LensKind | null,
  t: (typeof UI_TEXT)['en']
) {
  if (selectedLens === 'translation') return `${t.lensLabel}: ${t.translation}`
  if (selectedLens === 'word') return `${t.lensLabel}: ${t.word}`
  if (selectedLens === 'tension') return `${t.lensLabel}: ${t.tension}`
  return `${t.lensLabel}: ${t.phrase}`
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [verseText, setVerseText] = useState('')
  const [translatedVerseTexts, setTranslatedVerseTexts] = useState<Record<string, string>>({})
  const [verseLoading, setVerseLoading] = useState(true)
  const [verseError, setVerseError] = useState('')

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [insightsStage, setInsightsStage] = useState<InsightsStage>('idle')
  const [insightsError, setInsightsError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

  const [wordLensCardsByLanguage, setWordLensCardsByLanguage] =
    useState<Record<AppLanguage, InsightItem[]>>(emptyLensMap())
  const [tensionLensCardsByLanguage, setTensionLensCardsByLanguage] =
    useState<Record<AppLanguage, InsightItem[]>>(emptyLensMap())
  const [phraseLensCardsByLanguage, setPhraseLensCardsByLanguage] =
    useState<Record<AppLanguage, InsightItem[]>>(emptyLensMap())
  const [wordLensDataByLanguage, setWordLensDataByLanguage] =
    useState<Record<AppLanguage, WordLensPayload | null>>(emptyWordLensMap())
  const [wordLensArticleByLanguage, setWordLensArticleByLanguage] =
    useState<Record<AppLanguage, WordLensArticle | null>>(emptyWordLensArticleMap())
  const [activeWordLensNodeId, setActiveWordLensNodeId] = useState('')
  const [wordLensCustomPrompt, setWordLensCustomPrompt] = useState('')

  const [compareByLanguage, setCompareByLanguage] =
    useState<Record<AppLanguage, ComparePayload | null>>(emptyCompareMap())
  const [contextByLanguage, setContextByLanguage] =
    useState<Record<AppLanguage, ContextPayload | null>>(emptyContextMap())
  const [currentIndex, setCurrentIndex] = useState(0)

  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState('')
  const [compareCopyStatus, setCompareCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [compareShareStatus, setCompareShareStatus] = useState('')

  const [contextLoading, setContextLoading] = useState(false)
  const [contextError, setContextError] = useState('')
  const [contextCopyStatus, setContextCopyStatus] = useState<'idle' | 'copied'
