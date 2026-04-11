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
  const [contextCopyStatus, setContextCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [contextShareStatus, setContextShareStatus] = useState('')
  const [contextSheetOpen, setContextSheetOpen] = useState(false)
  const [selectedContext, setSelectedContext] = useState<ContextKind | null>(null)

  const [narrowContextData, setNarrowContextData] = useState<NarrowContextPayload | null>(null)
  const [narrowContextLoading, setNarrowContextLoading] = useState(false)
  const [narrowContextError, setNarrowContextError] = useState('')
  const [narrowCopyStatus, setNarrowCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [narrowShareStatus, setNarrowShareStatus] = useState('')
  const [activeNarrowDirectionId, setActiveNarrowDirectionId] = useState('')
  const [narrowArticle, setNarrowArticle] = useState<NarrowContextArticle | null>(null)
  const [narrowArticleLoading, setNarrowArticleLoading] = useState(false)
  const [narrowArticleError, setNarrowArticleError] = useState('')
  const [narrowArticleCopyStatus, setNarrowArticleCopyStatus] =
    useState<'idle' | 'copied' | 'failed'>('idle')
  const [narrowArticleShareStatus, setNarrowArticleShareStatus] = useState('')

  const [wordLensLoading, setWordLensLoading] = useState(false)
  const [wordLensError, setWordLensError] = useState('')
  const [wordLensCopyStatus, setWordLensCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [wordLensShareStatus, setWordLensShareStatus] = useState('')
  const [wordLensArticleLoading, setWordLensArticleLoading] = useState(false)
  const [wordLensArticleError, setWordLensArticleError] = useState('')
  const [wordLensArticleCopyStatus, setWordLensArticleCopyStatus] =
    useState<'idle' | 'copied' | 'failed'>('idle')
  const [wordLensArticleShareStatus, setWordLensArticleShareStatus] = useState('')

  const [tensionLensLoading, setTensionLensLoading] = useState(false)
  const [tensionLensError, setTensionLensError] = useState('')
  const [phraseLensLoading, setPhraseLensLoading] = useState(false)
  const [phraseLensError, setPhraseLensError] = useState('')

  const [appLanguage, setAppLanguage] = useState<AppLanguage>('en')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [translatedCards, setTranslatedCards] = useState<Record<string, InsightItem>>({})

  const [shareStatus, setShareStatus] = useState('')

  const [articleJobs, setArticleJobs] = useState<Record<string, ArticleJob>>({})
  const [activeArticleKey, setActiveArticleKey] = useState('')
  const [articleShareStatus, setArticleShareStatus] = useState('')
  const [articleCopyStatus, setArticleCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const [activeTab, setActiveTab] = useState<TopTab>('insights')
  const [lensSheetOpen, setLensSheetOpen] = useState(false)
  const [selectedLens, setSelectedLens] = useState<LensKind | null>(null)

  const copyTimerRef = useRef<number | null>(null)
  const exportCardRef = useRef<HTMLDivElement | null>(null)
  const articleTopRef = useRef<HTMLDivElement | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchDeltaXRef = useRef(0)

  const compareRequestIdRef = useRef(0)
  const contextRequestIdRef = useRef(0)
  const narrowRequestIdRef = useRef(0)
  const narrowArticleRequestIdRef = useRef(0)
  const wordLensRequestIdRef = useRef(0)
  const wordLensArticleRequestIdRef = useRef(0)
  const tensionLensRequestIdRef = useRef(0)
  const phraseLensRequestIdRef = useRef(0)
  const verseRequestIdRef = useRef(0)
  const insightsRequestIdRef = useRef(0)

  const t = UI_TEXT[appLanguage]
  const insightsBlockingLoad = insightsStage === 'loading_saved' && insights.length === 0
  const insightsBackgroundFill = insightsStage === 'filling'
  const modesReady = insights.length > 0
  const interactionsLocked = verseLoading || insightsBlockingLoad

  useEffect(() => {
    async function loadInitial() {
      const resolved = await params
      setBook(resolved.book)
      setChapter(resolved.chapter)
      setVerse(resolved.verse)
    }
    loadInitial()
  }, [params])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ARTICLE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, ArticleJob>
      if (parsed && typeof parsed === 'object') {
        setArticleJobs(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const readyJobs = Object.fromEntries(
        Object.entries(articleJobs).filter(([, job]) => job.status === 'ready' && job.article)
      )
      window.localStorage.setItem(ARTICLE_STORAGE_KEY, JSON.stringify(readyJobs))
    } catch {
      // ignore
    }
  }, [articleJobs])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!book || !chapter || !verse) return

    async function loadVerseOnly() {
      const requestId = ++verseRequestIdRef.current

      setVerseLoading(true)
      setVerseError('')
      setVerseText('')
      setTranslatedVerseTexts({})
      setInsights([])
      setInsightsStage('idle')
      setInsightsError('')
      setRawOutput('')
      setWordLensCardsByLanguage(emptyLensMap())
      setTensionLensCardsByLanguage(emptyLensMap())
      setPhraseLensCardsByLanguage(emptyLensMap())
      setWordLensDataByLanguage(emptyWordLensMap())
      setWordLensArticleByLanguage(emptyWordLensArticleMap())
      setActiveWordLensNodeId('')
      setWordLensCustomPrompt('')
      setWordLensCopyStatus('idle')
      setWordLensShareStatus('')
      setWordLensArticleLoading(false)
      setWordLensArticleError('')
      setWordLensArticleCopyStatus('idle')
      setWordLensArticleShareStatus('')
      setCompareByLanguage(emptyCompareMap())
      setContextByLanguage(emptyContextMap())
      setCompareError('')
      setCompareCopyStatus('idle')
      setCompareShareStatus('')
      setContextError('')
      setContextCopyStatus('idle')
      setContextShareStatus('')
      setContextSheetOpen(false)
      setSelectedContext(null)
      setNarrowContextData(null)
      setNarrowContextLoading(false)
      setNarrowContextError('')
      setNarrowCopyStatus('idle')
      setNarrowShareStatus('')
      setActiveNarrowDirectionId('')
      setNarrowArticle(null)
      setNarrowArticleLoading(false)
      setNarrowArticleError('')
      setNarrowArticleCopyStatus('idle')
      setNarrowArticleShareStatus('')
      setWordLensError('')
      setTensionLensError('')
      setPhraseLensError('')
      setCurrentIndex(0)
      setTranslationLoading(false)
      setTranslationError('')
      setTranslatedCards({})
      setShareStatus('')
      setActiveArticleKey('')
      setArticleShareStatus('')
      setArticleCopyStatus('idle')
      setActiveTab('insights')
      setSelectedLens(null)
      setLensSheetOpen(false)
      setAppLanguage('en')

      compareRequestIdRef.current += 1
      contextRequestIdRef.current += 1
      narrowRequestIdRef.current += 1
      narrowArticleRequestIdRef.current += 1
      wordLensRequestIdRef.current += 1
      wordLensArticleRequestIdRef.current += 1
      tensionLensRequestIdRef.current += 1
      phraseLensRequestIdRef.current += 1
      insightsRequestIdRef.current += 1

      try {
        const res = await fetch('/api/verse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book, chapter, verse }),
        })

        const data: VerseApiResponse = await res.json()

        if (requestId !== verseRequestIdRef.current) return

        if (!res.ok || !data.verseText) {
          setVerseError(data.error || t.verseUnavailable)
          return
        }

        setVerseText(data.verseText)
      } catch {
        if (requestId !== verseRequestIdRef.current) return
        setVerseError(t.verseUnavailable)
      } finally {
        if (requestId === verseRequestIdRef.current) {
          setVerseLoading(false)
        }
      }
    }

    loadVerseOnly()
  }, [book, chapter, verse])

  async function loadInsightsTwoPhase() {
    if (!book || !chapter || !verse || !verseText || verseError) return

    const requestId = ++insightsRequestIdRef.current

    setInsightsError('')
    setRawOutput('')
    setInsightsStage('loading_saved')

    let savedSnapshot: InsightItem[] = []

    try {
      const savedRes = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, chapter, verse, count: 0, targetLanguage: 'en' }),
      })

      const savedData: InsightsApiResponse = await savedRes.json()

      if (requestId !== insightsRequestIdRef.current) return

      if (savedRes.ok) {
        const receivedSaved = Array.isArray(savedData.savedInsights)
          ? savedData.savedInsights
          : Array.isArray(savedData.insights)
            ? savedData.insights
            : []

        if (receivedSaved.length > 0) {
          savedSnapshot = receivedSaved
          setInsights(receivedSaved)
          setCurrentIndex(0)
          setInsightsStage('filling')
        }
      }

      const fullRes = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, chapter, verse, count: 12, targetLanguage: 'en' }),
      })

      const fullData: InsightsApiResponse = await fullRes.json()

      if (requestId !== insightsRequestIdRef.current) return

      if (!fullRes.ok) {
        if (savedSnapshot.length > 0) {
          setInsightsStage('ready')
          return
        }

        setInsightsError(fullData.error || 'API request failed.')
        setRawOutput(fullData.raw || '')
        setInsightsStage('failed')
        return
      }

      const fullInsights = Array.isArray(fullData.insights) ? fullData.insights : []

      if (fullInsights.length > 0) {
        setInsights(fullInsights)
        setInsightsStage('ready')
      } else if (savedSnapshot.length > 0) {
        setInsightsStage('ready')
      } else {
        setInsightsError(fullData.error || 'No insights returned.')
        setRawOutput(fullData.raw || '')
        setInsightsStage('failed')
      }
    } catch {
      if (requestId !== insightsRequestIdRef.current) return

      if (savedSnapshot.length > 0) {
        setInsightsStage('ready')
        return
      }

      setInsightsError('Error loading insights.')
      setInsightsStage('failed')
    }
  }

  useEffect(() => {
    if (!book || !chapter || !verse || !verseText || verseError) return
    void loadInsightsTwoPhase()
  }, [book, chapter, verse, verseText, verseError])

  useEffect(() => {
    if (activeArticleKey && articleTopRef.current) {
      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeArticleKey])

  const formattedReference = useMemo(() => {
    if (!book || !chapter || !verse) return ''
    return `${formatBookLabel(book)} ${chapter}:${verse}`
  }, [book, chapter, verse])

  const verseTranslationKey = useMemo(() => {
    if (!verseText) return ''
    return `${book}:${chapter}:${verse}:${verseText}`
  }, [book, chapter, verse, verseText])

  const currentCards = useMemo(() => {
    if (activeTab === 'lens' && selectedLens === 'tension') {
      return tensionLensCardsByLanguage[appLanguage] || []
    }
    if (activeTab === 'lens' && selectedLens === 'phrase') {
      return phraseLensCardsByLanguage[appLanguage] || []
    }
    return insights
  }, [
    activeTab,
    selectedLens,
    appLanguage,
    tensionLensCardsByLanguage,
    phraseLensCardsByLanguage,
    insights,
  ])

  const currentInsight = useMemo(() => currentCards[currentIndex], [currentCards, currentIndex])

  const currentModeKey = useMemo(() => {
    if (activeTab === 'lens') return `lens:${selectedLens ?? 'none'}`
    if (activeTab === 'context') return `context:${selectedContext ?? 'none'}`
    return activeTab
  }, [activeTab, selectedLens, selectedContext])

  const currentSourceMode = useMemo<SourceMode>(() => {
    if (activeTab === 'lens' && selectedLens === 'word') return 'word'
    if (activeTab === 'lens' && selectedLens === 'tension') return 'tension'
    if (activeTab === 'lens' && selectedLens === 'phrase') return 'why_this_phrase'
    return 'insights'
  }, [activeTab, selectedLens])

  const compareData = useMemo(() => compareByLanguage[appLanguage], [compareByLanguage, appLanguage])
  const contextData = useMemo(() => contextByLanguage[appLanguage], [contextByLanguage, appLanguage])
  const wordLensData = useMemo(() => wordLensDataByLanguage[appLanguage], [wordLensDataByLanguage, appLanguage])
  const wordLensArticle = useMemo(
    () => wordLensArticleByLanguage[appLanguage],
    [wordLensArticleByLanguage, appLanguage]
  )

  const activeWordLensNode = useMemo(() => {
    if (!wordLensData || !activeWordLensNodeId) return null
    return wordLensData.nodes.find((item) => item.id === activeWordLensNodeId) ?? null
  }, [wordLensData, activeWordLensNodeId])

  const activeNarrowDirection = useMemo(() => {
    if (!narrowContextData || !activeNarrowDirectionId) return null
    return narrowContextData.directions.find((item) => item.id === activeNarrowDirectionId) ?? null
  }, [narrowContextData, activeNarrowDirectionId])

  async function translateCard(
    targetLanguage: 'ru' | 'es' | 'fr' | 'de',
    card: InsightItem,
    cardKey: string
  ) {
    const existingTranslation = translatedCards[`${targetLanguage}:${cardKey}`]
    if (existingTranslation) return existingTranslation

    const res = await fetch('/api/translate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: card.title,
        text: card.text,
        targetLanguage,
      }),
    })

    const data: TranslateCardApiResponse = await res.json()

    if (!res.ok || !data.card) {
      throw new Error(data.error || 'Translation failed.')
    }

    setTranslatedCards((prev) => ({
      ...prev,
      [`${targetLanguage}:${cardKey}`]: data.card as InsightItem,
    }))

    return data.card
  }

  async function translateVerseText(
    targetLanguage: 'ru' | 'es' | 'fr' | 'de',
    text: string,
    key: string
  ) {
    const existing = translatedVerseTexts[`${targetLanguage}:${key}`]
    if (existing) return existing

    const res = await fetch('/api/translate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Verse text',
        text,
        targetLanguage,
      }),
    })

    const data: TranslateCardApiResponse = await res.json()
    const translatedText = data?.card?.text?.trim()

    if (!res.ok || !translatedText) {
      throw new Error(data.error || 'Verse translation failed.')
    }

    setTranslatedVerseTexts((prev) => ({
      ...prev,
      [`${targetLanguage}:${key}`]: translatedText,
    }))

    return translatedText
  }

  async function loadWordLens(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText || !modesReady) return
    if (!force && wordLensDataByLanguage[language]) return

    const requestId = ++wordLensRequestIdRef.current

    setWordLensLoading(true)
    setWordLensError('')
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/word-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
          mode: 'map',
        }),
      })

      const data: WordLensMapApiResponse = await res.json()

      if (requestId !== wordLensRequestIdRef.current) return

      if (!res.ok || !Array.isArray(data.nodes) || data.nodes.length === 0 || typeof data.lead !== 'string') {
        setWordLensError(data.error || UI_TEXT[language].wordLensUnavailable)
        setWordLensDataByLanguage((prev) => ({ ...prev, [language]: null }))
        return
      }

      setWordLensDataByLanguage((prev) => ({
        ...prev,
        [language]: {
          lead: data.lead as string,
          nodes: data.nodes as WordLensNode[],
        },
      }))
    } catch {
      if (requestId !== wordLensRequestIdRef.current) return
      setWordLensError(UI_TEXT[language].wordLensUnavailable)
      setWordLensDataByLanguage((prev) => ({ ...prev, [language]: null }))
    } finally {
      if (requestId === wordLensRequestIdRef.current) {
        setWordLensLoading(false)
      }
    }
  }

  async function loadWordLensDeepDive(
    node: WordLensNode,
    force = false,
    language: AppLanguage = appLanguage
  ) {
    if (!formattedReference || !verseText) return
    if (!force && wordLensArticle && activeWordLensNodeId === node.id) return

    const requestId = ++wordLensArticleRequestIdRef.current

    setWordLensArticleLoading(true)
    setWordLensArticleError('')
    setActiveWordLensNodeId(node.id)
    setWordLensArticleCopyStatus('idle')
    setWordLensArticleShareStatus('')

    try {
      const res = await fetch('/api/word-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
          mode: 'deep_dive',
          node,
        }),
      })

      const data: WordLensArticleApiResponse = await res.json()

      if (requestId !== wordLensArticleRequestIdRef.current) return

      if (!res.ok || !data.article) {
        setWordLensArticleError(data.error || UI_TEXT[language].wordLensUnavailable)
        return
      }

      setWordLensArticleByLanguage((prev) => ({
        ...prev,
        [language]: data.article as WordLensArticle,
      }))
    } catch {
      if (requestId !== wordLensArticleRequestIdRef.current) return
      setWordLensArticleError(UI_TEXT[language].wordLensUnavailable)
    } finally {
      if (requestId === wordLensArticleRequestIdRef.current) {
        setWordLensArticleLoading(false)
      }
    }
  }

  async function loadWordLensCustomDig(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText) return
    const prompt = wordLensCustomPrompt.trim()
    if (!prompt) return
    if (!force && wordLensArticle && activeWordLensNodeId === 'custom') return

    const requestId = ++wordLensArticleRequestIdRef.current

    setWordLensArticleLoading(true)
    setWordLensArticleError('')
    setActiveWordLensNodeId('custom')
    setWordLensArticleCopyStatus('idle')
    setWordLensArticleShareStatus('')

    try {
      const res = await fetch('/api/word-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
          mode: 'custom_dig',
          prompt,
        }),
      })

      const data: WordLensArticleApiResponse = await res.json()

      if (requestId !== wordLensArticleRequestIdRef.current) return

      if (!res.ok || !data.article) {
        setWordLensArticleError(data.error || UI_TEXT[language].wordLensUnavailable)
        return
      }

      setWordLensArticleByLanguage((prev) => ({
        ...prev,
        [language]: data.article as WordLensArticle,
      }))
    } catch {
      if (requestId !== wordLensArticleRequestIdRef.current) return
      setWordLensArticleError(UI_TEXT[language].wordLensUnavailable)
    } finally {
      if (requestId === wordLensArticleRequestIdRef.current) {
        setWordLensArticleLoading(false)
      }
    }
  }

  async function loadTensionLens(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText || !modesReady) return
    if (!force && tensionLensCardsByLanguage[language]?.length > 0) return

    const requestId = ++tensionLensRequestIdRef.current

    setTensionLensLoading(true)
    setTensionLensError('')
    setCurrentIndex(0)
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/tension-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
        }),
      })

      const data = (await res.json()) as { cards?: InsightItem[]; error?: string }

      if (requestId !== tensionLensRequestIdRef.current) return

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setTensionLensError(data.error || UI_TEXT[language].tensionLensUnavailable)
        setTensionLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
        return
      }

      setTensionLensCardsByLanguage((prev) => ({ ...prev, [language]: data.cards as InsightItem[] }))
    } catch {
      if (requestId !== tensionLensRequestIdRef.current) return
      setTensionLensError(UI_TEXT[language].tensionLensUnavailable)
      setTensionLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
    } finally {
      if (requestId === tensionLensRequestIdRef.current) {
        setTensionLensLoading(false)
      }
    }
  }

  async function loadPhraseLens(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText || !modesReady) return
    if (!force && phraseLensCardsByLanguage[language]?.length > 0) return

    const requestId = ++phraseLensRequestIdRef.current

    setPhraseLensLoading(true)
    setPhraseLensError('')
    setCurrentIndex(0)
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/phrase-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
        }),
      })

      const data = (await res.json()) as { cards?: InsightItem[]; error?: string }

      if (requestId !== phraseLensRequestIdRef.current) return

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setPhraseLensError(data.error || UI_TEXT[language].phraseLensUnavailable)
        setPhraseLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
        return
      }

      setPhraseLensCardsByLanguage((prev) => ({ ...prev, [language]: data.cards as InsightItem[] }))
    } catch {
      if (requestId !== phraseLensRequestIdRef.current) return
      setPhraseLensError(UI_TEXT[language].phraseLensUnavailable)
      setPhraseLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
    } finally {
      if (requestId === phraseLensRequestIdRef.current) {
        setPhraseLensLoading(false)
      }
    }
  }

  async function loadCompare(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText || !modesReady) return
    if (!force && compareByLanguage[language]) return

    const requestId = ++compareRequestIdRef.current

    setCompareLoading(true)
    setCompareError('')
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
        }),
      })

      const data: CompareApiResponse = await res.json()

      if (requestId !== compareRequestIdRef.current) return

      if (!res.ok || !data.compare || !Array.isArray(data.compare.points)) {
        setCompareError(data.error || UI_TEXT[language].translationsUnavailable)
        setCompareByLanguage((prev) => ({ ...prev, [language]: null }))
        return
      }

      setCompareByLanguage((prev) => ({ ...prev, [language]: data.compare as ComparePayload }))
    } catch {
      if (requestId !== compareRequestIdRef.current) return
      setCompareError(UI_TEXT[language].translationsUnavailable)
      setCompareByLanguage((prev) => ({ ...prev, [language]: null }))
    } finally {
      if (requestId === compareRequestIdRef.current) {
        setCompareLoading(false)
      }
    }
  }

  async function loadContext(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText || !modesReady || !selectedContext) return
    if (!force && contextByLanguage[language]) return

    const requestId = ++contextRequestIdRef.current

    setContextLoading(true)
    setContextError('')
    setActiveArticleKey('')

    const mappedMode = selectedContext === 'narrow' ? 'paragraph' : 'book'

    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
          contextMode: mappedMode,
        }),
      })

      const data: ContextApiResponse = await res.json()

      if (requestId !== contextRequestIdRef.current) return

      if (!res.ok || !data.context || !Array.isArray(data.context.points)) {
        setContextError(data.error || UI_TEXT[language].contextUnavailable)
        setContextByLanguage((prev) => ({ ...prev, [language]: null }))
        return
      }

      setContextByLanguage((prev) => ({ ...prev, [language]: data.context as ContextPayload }))
    } catch {
      if (requestId !== contextRequestIdRef.current) return
      setContextError(UI_TEXT[language].contextUnavailable)
      setContextByLanguage((prev) => ({ ...prev, [language]: null }))
    } finally {
      if (requestId === contextRequestIdRef.current) {
        setContextLoading(false)
      }
    }
  }

  async function loadNarrowContext(force = false, language: AppLanguage = appLanguage) {
    if (!book || !chapter || !verse || !verseText || !modesReady) return
    if (!force && narrowContextData) return

    const requestId = ++narrowRequestIdRef.current

    setNarrowContextLoading(true)
    setNarrowContextError('')
    setNarrowArticle(null)
    setNarrowArticleError('')
    setNarrowArticleLoading(false)
    setActiveNarrowDirectionId('')
    setNarrowArticleCopyStatus('idle')
    setNarrowArticleShareStatus('')
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/narrow-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book,
          chapter,
          verse,
          targetLanguage: language,
        }),
      })

      const data: NarrowContextApiResponse = await res.json()

      if (requestId !== narrowRequestIdRef.current) return

      if (!res.ok || !data.paragraph || !Array.isArray(data.directions) || data.directions.length === 0) {
        setNarrowContextError(data.error || UI_TEXT[language].narrowUnavailable)
        setNarrowContextData(null)
        return
      }

      setNarrowContextData({
        verseText: String(data.verseText ?? ''),
        paragraph: {
          reference: String(data.paragraph.reference ?? ''),
          full_text: String(data.paragraph.full_text ?? ''),
          highlights: Array.isArray(data.paragraph.highlights) ? data.paragraph.highlights : [],
        },
        directions: data.directions,
      })
    } catch {
      if (requestId !== narrowRequestIdRef.current) return
      setNarrowContextError(UI_TEXT[language].narrowUnavailable)
      setNarrowContextData(null)
    } finally {
      if (requestId === narrowRequestIdRef.current) {
        setNarrowContextLoading(false)
      }
    }
  }

  async function loadNarrowArticle(
    direction: NarrowContextDirection,
    force = false,
    language: AppLanguage = appLanguage
  ) {
    if (!book || !chapter || !verse || !narrowContextData) return
    if (!force && narrowArticle && activeNarrowDirectionId === direction.id) return

    const requestId = ++narrowArticleRequestIdRef.current

    setNarrowArticleLoading(true)
    setNarrowArticleError('')
    setNarrowArticle(null)
    setActiveNarrowDirectionId(direction.id)
    setNarrowArticleCopyStatus('idle')
    setNarrowArticleShareStatus('')

    try {
      const res = await fetch('/api/narrow-context/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book,
          chapter,
          verse,
          paragraphReference: narrowContextData.paragraph.reference,
          paragraphText: narrowContextData.paragraph.full_text,
          direction,
          targetLanguage: language,
        }),
      })

      const data: NarrowContextDeepDiveResponse = await res.json()

      if (requestId !== narrowArticleRequestIdRef.current) return

      if (!res.ok || !data.article) {
        setNarrowArticleError(data.error || UI_TEXT[language].narrowArticleUnavailable)
        return
      }

      setNarrowArticle({
        title: String(data.article.title ?? ''),
        lead: String(data.article.lead ?? ''),
        body: Array.isArray(data.article.body) ? data.article.body : [],
        highlight_line: String(data.article.highlight_line ?? ''),
      })
    } catch {
      if (requestId !== narrowArticleRequestIdRef.current) return
      setNarrowArticleError(UI_TEXT[language].narrowArticleUnavailable)
    } finally {
      if (requestId === narrowArticleRequestIdRef.current) {
        setNarrowArticleLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!formattedReference || !verseText || !modesReady) return

    if (activeTab === 'context' && selectedContext === 'narrow') {
      void loadNarrowContext(false, appLanguage)
    }

    if (activeTab === 'context' && selectedContext === 'wide') {
      void loadContext(false, appLanguage)
    }

    if (activeTab === 'lens' && selectedLens === 'translation') void loadCompare(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'word') void loadWordLens(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'tension') void loadTensionLens(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'phrase') void loadPhraseLens(false, appLanguage)
  }, [activeTab, selectedContext, selectedLens, appLanguage, formattedReference, verseText, modesReady])

  async function handleSetLanguage(targetLanguage: AppLanguage) {
    if (interactionsLocked) return

    setTranslationError('')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setCompareCopyStatus('idle')
    setCompareShareStatus('')
    setContextCopyStatus('idle')
    setContextShareStatus('')
    setNarrowCopyStatus('idle')
    setNarrowShareStatus('')
    setNarrowArticleCopyStatus('idle')
    setNarrowArticleShareStatus('')
    setWordLensCopyStatus('idle')
    setWordLensShareStatus('')
    setWordLensArticleCopyStatus('idle')
    setWordLensArticleShareStatus('')

    if (targetLanguage === 'en') {
      setAppLanguage('en')
      return
    }

    if (activeTab === 'insights') {
      if (!currentInsight) {
        setAppLanguage(targetLanguage)
        return
      }

      const baseCardKey = `${currentModeKey}:${currentIndex}:${currentInsight.title}:${currentInsight.text}`

      setTranslationLoading(true)

      try {
        await Promise.all([
          translateCard(targetLanguage, currentInsight, baseCardKey),
          verseText && verseTranslationKey
            ? translateVerseText(targetLanguage, verseText, verseTranslationKey)
            : Promise.resolve(),
        ])
        setAppLanguage(targetLanguage)
      } catch (err) {
        setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
      } finally {
        setTranslationLoading(false)
      }

      return
    }

    if (verseText && verseTranslationKey) {
      setTranslationLoading(true)

      try {
        await translateVerseText(targetLanguage, verseText, verseTranslationKey)
      } catch (err) {
        setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
      } finally {
        setTranslationLoading(false)
      }
    }

    if (activeTab === 'context' && selectedContext === 'narrow') {
      setNarrowContextData(null)
      setNarrowContextError('')
      setNarrowContextLoading(false)
      setActiveNarrowDirectionId('')
      setNarrowArticle(null)
      setNarrowArticleError('')
      setNarrowArticleLoading(false)
      setNarrowCopyStatus('idle')
      setNarrowShareStatus('')
      setNarrowArticleCopyStatus('idle')
      setNarrowArticleShareStatus('')
    }

    if (activeTab === 'lens' && selectedLens === 'word') {
      setWordLensDataByLanguage((prev) => ({ ...prev, [targetLanguage]: null }))
      setWordLensArticleByLanguage((prev) => ({ ...prev, [targetLanguage]: null }))
      setActiveWordLensNodeId('')
      setWordLensArticleError('')
      setWordLensArticleLoading(false)
      setWordLensCopyStatus('idle')
      setWordLensShareStatus('')
      setWordLensArticleCopyStatus('idle')
      setWordLensArticleShareStatus('')
    }

    setAppLanguage(targetLanguage)
  }

  async function handleNext() {
    if (currentCards.length === 0 || interactionsLocked) return
    const nextIndex = (currentIndex + 1) % currentCards.length
    setCurrentIndex(nextIndex)

    if (activeTab === 'insights' && appLanguage !== 'en') {
      const nextInsight = currentCards[nextIndex]
      if (!nextInsight) return

      const nextCardKey = `${currentModeKey}:${nextIndex}:${nextInsight.title}:${nextInsight.text}`

      if (!translatedCards[`${appLanguage}:${nextCardKey}`]) {
        try {
          setTranslationLoading(true)
          await translateCard(appLanguage, nextInsight, nextCardKey)
        } catch (err) {
          setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
        } finally {
          setTranslationLoading(false)
        }
      }
    }
  }

  async function handlePrev() {
    if (currentCards.length === 0 || interactionsLocked) return
    const prevIndex = (currentIndex - 1 + currentCards.length) % currentCards.length
    setCurrentIndex(prevIndex)

    if (activeTab === 'insights' && appLanguage !== 'en') {
      const prevInsight = currentCards[prevIndex]
      if (!prevInsight) return

      const prevCardKey = `${currentModeKey}:${prevIndex}:${prevInsight.title}:${prevInsight.text}`

      if (!translatedCards[`${appLanguage}:${prevCardKey}`]) {
        try {
          setTranslationLoading(true)
          await translateCard(appLanguage, prevInsight, prevCardKey)
        } catch (err) {
          setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
        } finally {
          setTranslationLoading(false)
        }
      }
    }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
    touchDeltaXRef.current = 0
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartXRef.current === null) return
    const currentX = e.touches[0]?.clientX ?? touchStartXRef.current
    touchDeltaXRef.current = currentX - touchStartXRef.current
  }

  async function handleTouchEnd() {
    const threshold = 50
    const deltaX = touchDeltaXRef.current
    touchStartXRef.current = null
    touchDeltaXRef.current = 0

    if (Math.abs(deltaX) < threshold || interactionsLocked) return
    if (deltaX < 0) await handleNext()
    else await handlePrev()
  }

  const displayedCard = useMemo(() => {
    if (!currentInsight) return null

    if (activeTab === 'insights' && appLanguage !== 'en') {
      const baseKey = `${currentModeKey}:${currentIndex}:${currentInsight.title}:${currentInsight.text}`
      return translatedCards[`${appLanguage}:${baseKey}`] || currentInsight
    }

    return currentInsight
  }, [activeTab, appLanguage, currentInsight, currentIndex, currentModeKey, translatedCards])

  const displayedVerseText = useMemo(() => {
    if (appLanguage === 'en') return verseText
    if (!verseTranslationKey) return verseText
    return translatedVerseTexts[`${appLanguage}:${verseTranslationKey}`] || verseText
  }, [appLanguage, verseText, verseTranslationKey, translatedVerseTexts])

  const compareShareText = useMemo(() => {
    if (!compareData || !formattedReference) return ''

    return [
      formattedReference,
      '',
      compareData.lead,
      '',
      ...compareData.points.flatMap((point) => [
        point.title,
        `${point.labelA}: "${point.quoteA}"`,
        `${point.labelB}: "${point.quoteB}"`,
        point.text,
        '',
      ]),
      t.takeaway,
      compareData.takeaway,
    ]
      .filter(Boolean)
      .join('\n')
  }, [compareData, formattedReference, t.takeaway])

  const contextShareText = useMemo(() => {
    if (!contextData || !formattedReference) return ''

    return [
      formattedReference,
      '',
      contextData.lead,
      '',
      ...contextData.points.flatMap((point) => [point.title, point.text, '']),
      t.takeaway,
      contextData.takeaway,
    ]
      .filter(Boolean)
      .join('\n')
  }, [contextData, formattedReference, t.takeaway])

  const narrowShareText = useMemo(() => {
    if (!narrowContextData) return ''
    return [
      narrowContextData.paragraph.reference,
      '',
      narrowContextData.paragraph.full_text,
    ]
      .filter(Boolean)
      .join('\n')
  }, [narrowContextData])

  const narrowArticleShareText = useMemo(() => {
    if (!narrowArticle || !narrowContextData) return ''
    return [
      narrowContextData.paragraph.reference,
      '',
      narrowArticle.title,
      '',
      narrowArticle.lead,
      '',
      ...narrowArticle.body,
      ...(narrowArticle.highlight_line ? ['', narrowArticle.highlight_line] : []),
    ]
      .filter(Boolean)
      .join('\n')
  }, [narrowArticle, narrowContextData])

  const wordLensShareText = useMemo(() => {
    if (!wordLensData || !formattedReference) return ''
    return [
      formattedReference,
      '',
      wordLensData.lead,
      '',
      ...wordLensData.nodes.flatMap((node) => [
        node.label,
        `${node.original}${node.transliteration ? ` · ${node.transliteration}` : ''}`,
        node.semantic_core,
        node.why_it_matters,
        node.dig_deeper,
        '',
      ]),
    ]
      .filter(Boolean)
      .join('\n')
  }, [wordLensData, formattedReference])

  const wordLensArticleShareText = useMemo(() => {
    if (!wordLensArticle || !formattedReference) return ''
    return [
      formattedReference,
      '',
      wordLensArticle.title,
      '',
      wordLensArticle.lead,
      '',
      ...wordLensArticle.body,
      ...(wordLensArticle.highlight_line ? ['', wordLensArticle.highlight_line] : []),
    ]
      .filter(Boolean)
      .join('\n')
  }, [wordLensArticle, formattedReference])

  const shareText = useMemo(() => {
    if (!displayedCard || !formattedReference) return ''
    const verseBlock = displayedVerseText ? `${displayedVerseText}\n\n` : ''
    return `${formattedReference}\n\n${verseBlock}${displayedCard.title}\n\n${displayedCard.text}`
  }, [displayedCard, formattedReference, displayedVerseText])

  const articleJobKey = useMemo(() => {
    if (!displayedCard || !formattedReference || !displayedVerseText) return ''
    return `${appLanguage}:${currentModeKey}:${formattedReference}:${displayedCard.title}:${displayedCard.text}:${displayedVerseText}`
  }, [appLanguage, currentModeKey, formattedReference, displayedCard, displayedVerseText])

  const currentArticleJob = articleJobKey ? articleJobs[articleJobKey] : undefined
  const activeArticleJob = activeArticleKey ? articleJobs[activeArticleKey] : undefined

  async function handleUnfold() {
    if (!displayedCard || !formattedReference || !displayedVerseText || !articleJobKey || interactionsLocked) return

    const existingJob = articleJobs[articleJobKey]
    if (existingJob?.status === 'ready' && existingJob.article) {
      setActiveArticleKey(articleJobKey)
      setArticleShareStatus('')
      setArticleCopyStatus('idle')
      return
    }
    if (existingJob?.status === 'generating') return

    setArticleJobs((prev) => ({
      ...prev,
      [articleJobKey]: {
        status: 'generating',
        title: displayedCard.title,
        reference: formattedReference,
        verseText: displayedVerseText,
        language: appLanguage,
        createdAt: Date.now(),
      },
    }))

    try {
      const res = await fetch('/api/unfold-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText: displayedVerseText,
          insightTitle: displayedCard.title,
          insightText: displayedCard.text,
          targetLanguage: appLanguage,
          sourceMode: currentSourceMode,
          sourceAngleNote: null,
          sourceInsightId: null,
        }),
      })

      const data: UnfoldApiResponse = await res.json()

      if (!res.ok || !data.article) {
        throw new Error(data.error || 'Failed to generate article.')
      }

      setArticleJobs((prev) => ({
        ...prev,
        [articleJobKey]: {
          status: 'ready',
          article: data.article,
          title: displayedCard.title,
          reference: formattedReference,
          verseText: displayedVerseText,
          language: appLanguage,
          createdAt: Date.now(),
        },
      }))
    } catch (err) {
      setArticleJobs((prev) => ({
        ...prev,
        [articleJobKey]: {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Failed to generate article.',
          title: displayedCard.title,
          reference: formattedReference,
          verseText: displayedVerseText,
          language: appLanguage,
          createdAt: Date.now(),
        },
      }))
    }
  }

  async function handleCopyArticle() {
    if (!activeArticleJob?.article) return

    const text = [
      activeArticleJob.reference,
      '',
      activeArticleJob.article.title,
      '',
      activeArticleJob.article.lead,
      '',
      ...activeArticleJob.article.body,
      ...(activeArticleJob.article.quote ? ['', `“${activeArticleJob.article.quote}”`] : []),
    ].join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setArticleCopyStatus('copied')
      setArticleShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setArticleCopyStatus('idle')
      }, 1600)
    } catch {
      setArticleCopyStatus('failed')
    }
  }

  async function handleShareArticle() {
    if (!activeArticleJob?.article) return

    const text = [
      activeArticleJob.reference,
      '',
      activeArticleJob.article.title,
      '',
      activeArticleJob.article.lead,
      '',
      ...activeArticleJob.article.body,
      ...(activeArticleJob.article.quote ? ['', `“${activeArticleJob.article.quote}”`] : []),
    ].join('\n\n')

    try {
      if (navigator.share) {
        await navigator.share({ text })
        setArticleShareStatus(t.articleShared)
      } else {
        await navigator.clipboard.writeText(text)
        setArticleShareStatus(t.shareUnavailableArticleCopied)
      }
    } catch {
      setArticleShareStatus('')
    }
  }

  async function handleShare() {
    if (!displayedCard || !formattedReference || interactionsLocked) return
    setShareStatus('')

    try {
      if (exportCardRef.current) {
        const dataUrl = await toPng(exportCardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#f2e7cf',
        })

        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `${formattedReference}.png`, {
          type: 'image/png',
        })

        if (
          navigator.share &&
          'canShare' in navigator &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({ files: [file] })
          setShareStatus(t.sharedAsImage)
          return
        }
      }

      if (navigator.share) {
        await navigator.share({ text: shareText })
        setShareStatus(t.sharedAsText)
      } else {
        await navigator.clipboard.writeText(shareText)
        setShareStatus(t.shareUnavailableCopiedInstead)
      }
    } catch {
      setShareStatus('')
    }
  }

  async function handleCopyNarrow() {
    if (!narrowShareText) return

    try {
      await navigator.clipboard.writeText(narrowShareText)
      setNarrowCopyStatus('copied')
      setNarrowShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setNarrowCopyStatus('idle')
      }, 1600)
    } catch {
      setNarrowCopyStatus('failed')
    }
  }

  async function handleShareNarrow() {
    if (!narrowShareText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: narrowShareText })
        setNarrowShareStatus(t.sharedAsText)
      } else {
        await navigator.clipboard.writeText(narrowShareText)
        setNarrowShareStatus(t.shareUnavailableCopiedInstead)
      }
    } catch {
      setNarrowShareStatus('')
    }
  }

  async function handleCopyNarrowArticle() {
    if (!narrowArticleShareText) return

    try {
      await navigator.clipboard.writeText(narrowArticleShareText)
      setNarrowArticleCopyStatus('copied')
      setNarrowArticleShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setNarrowArticleCopyStatus('idle')
      }, 1600)
    } catch {
      setNarrowArticleCopyStatus('failed')
    }
  }

  async function handleShareNarrowArticle() {
    if (!narrowArticleShareText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: narrowArticleShareText })
        setNarrowArticleShareStatus(t.sharedAsText)
      } else {
        await navigator.clipboard.writeText(narrowArticleShareText)
        setNarrowArticleShareStatus(t.shareUnavailableCopiedInstead)
      }
    } catch {
      setNarrowArticleShareStatus('')
    }
  }

  async function handleCopyWordLens() {
    if (!wordLensShareText) return

    try {
      await navigator.clipboard.writeText(wordLensShareText)
      setWordLensCopyStatus('copied')
      setWordLensShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setWordLensCopyStatus('idle')
      }, 1600)
    } catch {
      setWordLensCopyStatus('failed')
    }
  }

  async function handleShareWordLens() {
    if (!wordLensShareText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: wordLensShareText })
        setWordLensShareStatus(t.sharedAsText)
      } else {
        await navigator.clipboard.writeText(wordLensShareText)
        setWordLensShareStatus(t.shareUnavailableCopiedInstead)
      }
    } catch {
      setWordLensShareStatus('')
    }
  }

  async function handleCopyWordLensArticle() {
    if (!wordLensArticleShareText) return

    try {
      await navigator.clipboard.writeText(wordLensArticleShareText)
      setWordLensArticleCopyStatus('copied')
      setWordLensArticleShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setWordLensArticleCopyStatus('idle')
      }, 1600)
    } catch {
      setWordLensArticleCopyStatus('failed')
    }
  }

  async function handleShareWordLensArticle() {
    if (!wordLensArticleShareText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: wordLensArticleShareText })
        setWordLensArticleShareStatus(t.sharedAsText)
      } else {
        await navigator.clipboard.writeText(wordLensArticleShareText)
        setWordLensArticleShareStatus(t.shareUnavailableCopiedInstead)
      }
    } catch {
      setWordLensArticleShareStatus('')
    }
  }

  function handleCompareBackToTop() {
    if (articleTopRef.current) {
      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function handleCopyCompare() {
    if (!compareShareText) return

    try {
      await navigator.clipboard.writeText(compareShareText)
      setCompareCopyStatus('copied')
      setCompareShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCompareCopyStatus('idle')
      }, 1600)
    } catch {
      setCompareCopyStatus('failed')
    }
  }

  async function handleShareCompare() {
    if (!compareShareText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: compareShareText })
        setCompareShareStatus(t.sharedAsText)
        setCompareCopyStatus('idle')
      } else {
        await navigator.clipboard.writeText(compareShareText)
        setCompareShareStatus(t.shareUnavailableCopiedInstead)
        setCompareCopyStatus('idle')
      }
    } catch {
      setCompareShareStatus('')
    }
  }

  function handleContextBackToTop() {
    if (articleTopRef.current) {
      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  async function handleCopyContext() {
    if (!contextShareText) return

    try {
      await navigator.clipboard.writeText(contextShareText)
      setContextCopyStatus('copied')
      setContextShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setContextCopyStatus('idle')
      }, 1600)
    } catch {
      setContextCopyStatus('failed')
    }
  }

  async function handleShareContext() {
    if (!contextShareText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: contextShareText })
        setContextShareStatus(t.sharedAsText)
        setContextCopyStatus('idle')
      } else {
        await navigator.clipboard.writeText(contextShareText)
        setContextShareStatus(t.shareUnavailableCopiedInstead)
        setContextCopyStatus('idle')
      }
    } catch {
      setContextShareStatus('')
    }
  }

  async function handleSelectLens(lens: LensKind) {
    if (!modesReady) return

    setSelectedLens(lens)
    setLensSheetOpen(false)
    setActiveTab('lens')
    setActiveArticleKey('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setCurrentIndex(0)

    if (lens === 'word') {
      setActiveWordLensNodeId('')
      setWordLensArticleByLanguage(emptyWordLensArticleMap())
      setWordLensArticleError('')
      setWordLensCustomPrompt('')
    }

    if (lens === 'translation') await loadCompare(false, appLanguage)
    if (lens === 'word') await loadWordLens(false, appLanguage)
    if (lens === 'tension') await loadTensionLens(false, appLanguage)
    if (lens === 'phrase') await loadPhraseLens(false, appLanguage)
  }

  async function handleSelectContext(mode: ContextKind) {
    if (!modesReady) return

    setSelectedContext(mode)
    setContextSheetOpen(false)
    setActiveTab('context')
    setActiveArticleKey('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')

    if (mode === 'narrow') {
      setNarrowContextData(null)
      setNarrowContextError('')
      setNarrowArticle(null)
      setNarrowArticleError('')
      setActiveNarrowDirectionId('')
      await loadNarrowContext(true, appLanguage)
      return
    }

    setContextByLanguage(emptyContextMap())
    await loadContext(true, appLanguage)
  }

  function renderTabButton(label: string, isActive: boolean, onClick: () => void, disabled = false) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 ${
          isActive
            ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
            : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
        }`}
      >
        {label}
      </button>
    )
  }

  function renderContextModeIntro() {
    return renderStructuredPanel(
      t.contextTitle,
      t.contextLead,
      t.contextPointLabel,
      [t.contextPoint1, t.contextPoint2, t.contextPoint3],
      t.takeaway,
      t.contextTakeaway
    )
  }

  function renderLensModeIntro() {
    return renderStructuredPanel(
      t.lens,
      t.lensLeadDefault,
      t.lensPointLabel,
      [t.translation, t.word, t.tension, t.phrase],
      t.takeaway,
      t.lensTakeawayDefault
    )
  }

  function renderSharedCardStack() {
    return (
      <CardStackView
        activeArticle={activeArticleJob?.status === 'ready' ? activeArticleJob.article ?? null : null}
        activeArticleReference={activeArticleJob?.reference ?? ''}
        activeArticleShareStatus={articleShareStatus}
        articleCopyStatus={articleCopyStatus}
        onBackFromArticle={() => {
          setActiveArticleKey('')
          setArticleShareStatus('')
          setArticleCopyStatus('idle')
          articleTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        onCopyArticle={() => {
          void handleCopyArticle()
        }}
        onShareArticle={() => {
          void handleShareArticle()
        }}
        insightsBlockingLoad={insightsBlockingLoad}
        insightsError={insightsError}
        rawOutput={rawOutput}
        currentCards={currentCards}
        currentIndex={currentIndex}
        insightsBackgroundFill={insightsBackgroundFill}
        activeTab={activeTab}
        displayedCard={displayedCard}
        selectedLens={selectedLens}
        selectedContext={selectedContext as any}
        currentArticleStatus={currentArticleJob?.status ?? 'idle'}
        currentArticleError={currentArticleJob?.error ?? ''}
        copyStatus="idle"
        shareStatus={shareStatus}
        translationError={translationError}
        onRetryInsights={() => {
          void loadInsightsTwoPhase()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          void handleTouchEnd()
        }}
        onUnfold={() => {
          void handleUnfold()
        }}
        onShare={() => {
          void handleShare()
        }}
        onPrev={() => {
          void handlePrev()
        }}
        onNext={() => {
          void handleNext()
        }}
        onOpenLensSheet={() => setLensSheetOpen(true)}
        onOpenContextSheet={() => setContextSheetOpen(true)}
        t={t as any}
      />
    )
  }

  function renderLensView() {
    if (!modesReady) {
      return renderLensModeIntro()
    }

    if (selectedLens === 'translation') {
      return (
        <CompareView
          isReady={modesReady}
          isLoading={compareLoading}
          error={compareError}
          data={compareData}
          title={t.translations}
          leadFallback={t.translationsLead}
          takeawayFallback={t.translationsTakeaway}
          diffLabel={t.translationsDiffLabel}
          takeawayLabel={t.takeaway}
          loadingLabel={t.loadingTranslations}
          loadingText={t.loadingTranslationsText}
          unavailableLabel={t.translations}
          point1={t.translationsPoint1}
          point2={t.translationsPoint2}
          point3={t.translationsPoint3}
          tryAgainLabel={t.tryAgain}
          backToTopLabel={t.backToTop}
          copyLabel={t.copyAnalysis}
          copiedLabel={t.copiedAnalysis}
          copyFailedLabel={t.copyFailed}
          shareLabel={t.shareAnalysis}
          copyStatus={compareCopyStatus}
          shareStatus={compareShareStatus}
          onRetry={() => {
            void loadCompare(true, appLanguage)
          }}
          onBackToTop={handleCompareBackToTop}
          onCopy={() => {
            void handleCopyCompare()
          }}
          onShare={() => {
            void handleShareCompare()
          }}
        />
      )
    }

    if (selectedLens === 'word') {
      if (activeWordLensNodeId) {
        return (
          <WordLensArticleView
            article={wordLensArticle}
            isLoading={wordLensArticleLoading}
            error={wordLensArticleError}
            articleLabel={t.word}
            loadingLabel={t.loadingWordLens}
            loadingText={t.loadingWordLensText}
            unavailableLabel={t.wordLensUnavailable}
            backLabel={t.backToMeanings}
            shareLabel={t.share}
            copiedLabel={t.copied}
            copyLabel={t.copy}
            copyFailedLabel={t.copyFailed}
            shareStatus={wordLensArticleShareStatus}
            copyStatus={wordLensArticleCopyStatus}
            tryAgainLabel={t.tryAgain}
            onBack={() => {
              setActiveWordLensNodeId('')
              setWordLensArticleByLanguage((prev) => ({ ...prev, [appLanguage]: null }))
              setWordLensArticleError('')
              setWordLensArticleLoading(false)
              setWordLensArticleCopyStatus('idle')
              setWordLensArticleShareStatus('')
              articleTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            onCopy={() => {
              void handleCopyWordLensArticle()
            }}
            onShare={() => {
              void handleShareWordLensArticle()
            }}
            onRetry={() => {
              if (activeWordLensNode && activeWordLensNodeId !== 'custom') {
                void loadWordLensDeepDive(activeWordLensNode, true, appLanguage)
              } else if (activeWordLensNodeId === 'custom') {
                void loadWordLensCustomDig(true, appLanguage)
              }
            }}
          />
        )
      }

      return (
        <WordLensView
          isReady={modesReady}
          isLoading={wordLensLoading}
          error={wordLensError}
          data={wordLensData}
          title={t.word}
          leadFallback={t.wordHelper}
          takeawayFallback={t.lensTakeawayDefault}
          pointLabel={t.lensPointLabel}
          takeawayLabel={t.takeaway}
          loadingLabel={t.loadingWordLens}
          loadingText={t.loadingWordLensText}
          unavailableLabel={t.wordLensUnavailable}
          tryAgainLabel={t.tryAgain}
          changeLabel={t.change}
          copyLabel={t.copy}
          copiedLabel={t.copied}
          copyFailedLabel={t.copyFailed}
          shareLabel={t.share}
          shareStatus={wordLensShareStatus}
          copyStatus={wordLensCopyStatus}
          customPromptValue={wordLensCustomPrompt}
          onCustomPromptChange={setWordLensCustomPrompt}
          onRetry={() => {
            void loadWordLens(true, appLanguage)
          }}
          onChangeMode={() => setLensSheetOpen(true)}
          onCopy={() => {
            void handleCopyWordLens()
          }}
          onShare={() => {
            void handleShareWordLens()
          }}
          onNodeSelect={(nodeId) => {
            const node = wordLensData?.nodes.find((item) => item.id === nodeId)
            if (!node) return
            void loadWordLensDeepDive(node, true, appLanguage)
          }}
          onCustomDig={() => {
            void loadWordLensCustomDig(true, appLanguage)
          }}
        />
      )
    }

    if (selectedLens === 'tension') {
      if (tensionLensLoading) {
        return (
          <ModeStateCard
            title={t.loadingTensionLens}
            loadingLabel={t.loadingTensionLens}
            loadingText={t.loadingTensionLensText}
          />
        )
      }

      if (tensionLensError) {
        return (
          <ModeStateCard
            badgeLabel={lensBadgeLabel('tension', t)}
            changeLabel={t.change}
            onChange={() => setLensSheetOpen(true)}
            error={tensionLensError}
            retryLabel={t.tryAgain}
            onRetry={() => {
              void loadTensionLens(true, appLanguage)
            }}
          />
        )
      }

      return renderSharedCardStack()
    }

    if (selectedLens === 'phrase') {
      if (phraseLensLoading) {
        return (
          <ModeStateCard
            title={t.loadingPhraseLens}
            loadingLabel={t.loadingPhraseLens}
            loadingText={t.loadingPhraseLensText}
          />
        )
      }

      if (phraseLensError) {
        return (
          <ModeStateCard
            badgeLabel={lensBadgeLabel('phrase', t)}
            changeLabel={t.change}
            onChange={() => setLensSheetOpen(true)}
            error={phraseLensError}
            retryLabel={t.tryAgain}
            onRetry={() => {
              void loadPhraseLens(true, appLanguage)
            }}
          />
        )
      }

      return renderSharedCardStack()
    }

    return renderLensModeIntro()
  }

  function renderContextView() {
    if (!modesReady) {
      return renderContextModeIntro()
    }

    if (!selectedContext) {
      return renderContextModeIntro()
    }

    if (selectedContext === 'narrow') {
      if (activeNarrowDirectionId) {
        return (
          <NarrowContextArticleView
            article={narrowArticle}
            isLoading={narrowArticleLoading}
            error={narrowArticleError}
            articleLabel={t.narrowArticleLabel}
            loadingLabel={t.narrowArticleLoading}
            loadingText={t.narrowArticleLoadingText}
            unavailableLabel={t.narrowArticleUnavailable}
            backLabel={t.backToMeanings}
            shareLabel={t.share}
            copiedLabel={t.copied}
            copyLabel={t.copy}
            copyFailedLabel={t.copyFailed}
            shareStatus={narrowArticleShareStatus}
            copyStatus={narrowArticleCopyStatus}
            tryAgainLabel={t.tryAgain}
            onBack={() => {
              setActiveNarrowDirectionId('')
              setNarrowArticle(null)
              setNarrowArticleError('')
              setNarrowArticleLoading(false)
              setNarrowArticleCopyStatus('idle')
              setNarrowArticleShareStatus('')
              articleTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            onCopy={() => {
              void handleCopyNarrowArticle()
            }}
            onShare={() => {
              void handleShareNarrowArticle()
            }}
            onRetry={() => {
              if (activeNarrowDirection) {
                void loadNarrowArticle(activeNarrowDirection, true, appLanguage)
              }
            }}
          />
        )
      }

      return (
        <NarrowContextView
          isReady={modesReady}
          isLoading={narrowContextLoading}
          error={narrowContextError}
          data={narrowContextData}
          title={t.narrowContext}
          introLead={t.narrowIntroLead}
          introTakeaway={t.narrowIntroTakeaway}
          pointLabel={t.contextPointLabel}
          takeawayLabel={t.takeaway}
          loadingLabel={t.narrowLoading}
          loadingText={t.narrowLoadingText}
          unavailableLabel={t.narrowUnavailable}
          point1={t.narrowPoint1}
          point2={t.narrowPoint2}
          point3={t.narrowPoint3}
          point4={t.narrowPoint4}
          point5={t.narrowPoint5}
          paragraphLabel={t.paragraphLabel}
          highlightsLabel={t.highlightsLabel}
          directionsLabel={t.directionsLabel}
          whyItMattersLabel={t.whyItMattersLabel}
          digDeeperLabel={t.digDeeperLabel}
          tryAgainLabel={t.tryAgain}
          shareLabel={t.share}
          changeLabel={t.change}
          copiedLabel={t.copied}
          copyLabel={t.copy}
          copyFailedLabel={t.copyFailed}
          shareStatus={narrowShareStatus}
          copyStatus={narrowCopyStatus}
          targetVerseText={narrowContextData?.verseText || displayedVerseText}
          onRetry={() => {
            void loadNarrowContext(true, appLanguage)
          }}
          onDirectionSelect={(directionId) => {
            const direction = narrowContextData?.directions.find((item) => item.id === directionId)
            if (!direction) return
            void loadNarrowArticle(direction, true, appLanguage)
          }}
          onChangeMode={() => setContextSheetOpen(true)}
          onCopy={() => {
            void handleCopyNarrow()
          }}
          onShare={() => {
            void handleShareNarrow()
          }}
        />
      )
    }

    return (
      <ContextView
        isReady={modesReady}
        isLoading={contextLoading}
        error={contextError}
        data={contextData}
        selectedMode={selectedContext}
        title={t.context}
        leadFallback={t.contextLead}
        takeawayFallback={t.contextTakeaway}
        pointLabel={t.contextPointLabel}
        takeawayLabel={t.takeaway}
        loadingLabel={t.loadingContext}
        loadingText={t.loadingContextText}
        unavailableLabel={t.context}
        point1={t.contextPoint1}
        point2={t.contextPoint2}
        point3={t.contextPoint3}
        narrowLabel={t.narrowContext}
        wideLabel={t.wideContext}
        changeLabel={t.change}
        tryAgainLabel={t.tryAgain}
        backToTopLabel={t.backToTop}
        copyLabel={t.copyAnalysis}
        copiedLabel={t.copiedAnalysis}
        copyFailedLabel={t.copyFailed}
        shareLabel={t.shareAnalysis}
        copyStatus={contextCopyStatus}
        shareStatus={contextShareStatus}
        onRetry={() => {
          void loadContext(true, appLanguage)
        }}
        onBackToTop={handleContextBackToTop}
        onCopy={() => {
          void handleCopyContext()
        }}
        onShare={() => {
          void handleShareContext()
        }}
        onChangeMode={() => setContextSheetOpen(true)}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-neutral-900">
      <div ref={articleTopRef} className="mx-auto flex w-full max-w-md flex-col">
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link href="/" className="text-neutral-500 transition hover:text-neutral-700">
            {t.home}
          </Link>
        </div>

        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-stone-900">
          {formattedReference || 'Loading...'}
        </h1>

        <div className="mb-5 flex gap-5 overflow-x-auto pb-1 text-[0.98rem] leading-6">
          {(['en', 'es', 'fr', 'de', 'ru'] as AppLanguage[]).map((lang) => {
            const isActive = appLanguage === lang
            const label =
              lang === 'en'
                ? t.english
                : lang === 'es'
                  ? t.spanish
                  : lang === 'fr'
                    ? t.french
                    : lang === 'de'
                      ? t.german
                      : t.russian

            const isLoading =
              translationLoading &&
              activeTab === 'insights' &&
              appLanguage !== lang &&
              lang !== 'en'

            return (
              <button
                key={lang}
                type="button"
                onClick={() => void handleSetLanguage(lang)}
                disabled={translationLoading || interactionsLocked}
                className={`whitespace-nowrap border-b bg-transparent pb-1 transition disabled:opacity-45 ${
                  isActive
                    ? 'border-stone-500 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                {isLoading ? t.translating : label}
              </button>
            )
          })}
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {renderTabButton(
            t.insights,
            activeTab === 'insights',
            () => {
              setActiveTab('insights')
              setLensSheetOpen(false)
              setContextSheetOpen(false)
            },
            false
          )}
          {renderTabButton(
            t.context,
            activeTab === 'context',
            () => {
              if (!modesReady) return
              setContextSheetOpen(true)
              setLensSheetOpen(false)
              setActiveArticleKey('')
            },
            !modesReady
          )}
          {renderTabButton(
            t.lens,
            activeTab === 'lens',
            () => {
              if (!modesReady) return
              setLensSheetOpen(true)
              setContextSheetOpen(false)
              setActiveArticleKey('')
            },
            !modesReady
          )}
        </div>

        <VerseBlock
          isLoading={verseLoading}
          error={verseError}
          reference={formattedReference}
          verseText={displayedVerseText}
          loadingLabel={t.verseLoading}
          loadingText={t.verseLoadingText}
          unavailableLabel={t.verseUnavailable}
        />

        {!verseLoading && !verseError && activeTab === 'insights' && renderSharedCardStack()}
        {!verseLoading && !verseError && activeTab === 'context' && renderContextView()}
        {!verseLoading && !verseError && activeTab === 'lens' && renderLensView()}
      </div>

      {displayedCard && !insightsBlockingLoad && !insightsError && (
        <div className="pointer-events-none fixed -left-[9999px] top-0 z-[-1]">
          <div
            ref={exportCardRef}
            style={{
              width: 1080,
              background: 'linear-gradient(180deg, #f6ecd6 0%, #efe2bf 100%)',
              padding: '48px',
              borderRadius: '44px',
              color: '#1c1917',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                borderRadius: '34px',
                border: '1px solid rgba(120, 97, 61, 0.14)',
                background: 'radial-gradient(circle at top, #fbf5e8 0%, #f2e7cf 55%, #ead9b6 100%)',
                padding: '64px 72px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#78716c',
                  marginBottom: '34px',
                }}
              >
                {formattedReference}
              </div>

              {displayedVerseText ? (
                <div
                  style={{
                    marginBottom: '38px',
                    padding: '24px 28px',
                    borderRadius: '24px',
                    border: '1px solid rgba(120, 97, 61, 0.18)',
                    background: 'rgba(251, 246, 234, 0.72)',
                    fontSize: '30px',
                    lineHeight: 1.8,
                    color: '#44403c',
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {displayedVerseText}
                </div>
              ) : null}

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '68px',
                  lineHeight: 1.08,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#1c1917',
                  marginBottom: '42px',
                }}
              >
                {displayedCard.title}
              </div>

              <div
                style={{
                  fontSize: '42px',
                  lineHeight: 1.75,
                  color: '#292524',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {displayedCard.text}
              </div>

              <div
                style={{
                  marginTop: '44px',
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#78716c',
                }}
              >
                Scriptura+
              </div>
            </div>
          </div>
        </div>
      )}

      <LensSheet
        isOpen={lensSheetOpen && modesReady}
        title={t.lensTitle}
        subtitle={t.chooseFocusedLens}
        description={t.readThisVerseOneAngle}
        closeLabel={t.close}
        translationLabel={t.translation}
        wordLabel={t.word}
        tensionLabel={t.tension}
        phraseLabel={t.phrase}
        translationHelper={t.translationHelper}
        wordHelper={t.wordHelper}
        tensionHelper={t.tensionHelper}
        phraseHelper={t.phraseHelper}
        onClose={() => setLensSheetOpen(false)}
        onSelect={(lens) => {
          void handleSelectLens(lens)
        }}
      />

      <ContextSheet
        isOpen={contextSheetOpen && modesReady}
        title={t.contextTitle}
        subtitle={t.chooseContextMode}
        description={t.readThisVerseThroughContext}
        closeLabel={t.close}
        narrowLabel={t.narrowContext}
        wideLabel={t.wideContext}
        narrowHelper={t.narrowHelper}
        wideHelper={t.wideHelper}
        onClose={() => setContextSheetOpen(false)}
        onSelect={(mode) => {
          void handleSelectContext(mode)
        }}
      />

      <style jsx global>{`
        @keyframes scriptura-fade-slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scriptura-sheet-overlay {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(10px);
          }
        }

        @keyframes scriptura-sheet-up {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes scriptura-card-pop {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes scriptura-soft-fade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scriptura-skeleton {
          0% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.55;
          }
        }

        .tab-panel-enter {
          animation: scriptura-fade-slide-up 220ms ease;
        }

        .sheet-overlay {
          animation: scriptura-sheet-overlay 220ms ease;
        }

        .sheet-panel {
          animation: scriptura-sheet-up 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .card-pop {
          animation: scriptura-card-pop 240ms ease;
        }

        .verse-enter,
        .title-fade,
        .text-fade {
          animation: scriptura-soft-fade 260ms ease;
        }

        .skeleton-line {
          animation: scriptura-skeleton 1.45s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
