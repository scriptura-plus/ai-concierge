'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import VerseBlock from './components/VerseBlock'
import LensSheet from './components/LensSheet'
import ContextSheet from './components/ContextSheet'

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

type LensApiResponse = {
  cards?: InsightItem[]
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
type ContextKind = 'paragraph' | 'book' | 'bible'
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
    paragraph: string
    bookMode: string
    bibleMode: string
    paragraphHelper: string
    bookHelper: string
    bibleHelper: string

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
      'This mode will surface only the context that materially changes the reading of the verse.',
    contextTakeaway:
      'Context should clarify why the verse sounds the way it does inside its real setting.',
    contextPointLabel: 'Context point',
    contextTitle: 'Context',
    chooseContextMode: 'Choose a context level',
    readThisVerseThroughContext: 'See this verse inside a wider frame.',
    paragraph: 'Paragraph',
    bookMode: 'Book',
    bibleMode: 'Bible',
    paragraphHelper: 'Immediate flow around the verse',
    bookHelper: 'How the verse works inside the book',
    bibleHelper: 'How the verse connects to the wider Bible',
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
    contextPoint1: 'Choose the immediate paragraph around the verse.',
    contextPoint2: 'Choose the whole-book movement and purpose.',
    contextPoint3: 'Choose the wider Bible-level connections and echoes.',
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
      'Tracing the immediate forces, flow, and setting that sharpen the verse…',
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
      'Этот режим будет показывать только тот контекст, который реально меняет чтение стиха.',
    contextTakeaway:
      'Контекст должен объяснять, почему стих звучит именно так в своей реальной среде.',
    contextPointLabel: 'Пункт контекста',
    contextTitle: 'Контекст',
    chooseContextMode: 'Выберите уровень контекста',
    readThisVerseThroughContext: 'Посмотрите на стих в более широкой рамке.',
    paragraph: 'Абзац',
    bookMode: 'Книга',
    bibleMode: 'Библия',
    paragraphHelper: 'Ближайший поток мысли вокруг стиха',
    bookHelper: 'Как стих работает внутри книги',
    bibleHelper: 'Как стих соединяется со всей Библией',
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
    lensTakeawayDefault: '«Линза» — это семейство сфокусированного чтения, а не просто кнопка reroll.',
    translationsPoint1: 'Короткий lead будет называть главное переводческое напряжение в стихе.',
    translationsPoint2:
      'Финальная версия покажет 3–5 компактных различий вместо одного плотного блока.',
    translationsPoint3:
      'Короткий вывод объяснит, почему эти различия важны для чтения стиха.',
    contextPoint1: 'Выберите ближайший абзац вокруг стиха.',
    contextPoint2: 'Выберите движение и цель всей книги.',
    contextPoint3: 'Выберите связи и отзвуки по всей Библии.',
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
      'Отслеживаем ближайшие силы, ход мысли и обстановку, которые заостряют чтение стиха…',
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
      'Este modo mostrará solo el contexto que realmente cambia la lectura del versículo.',
    contextTakeaway:
      'El contexto debe aclarar por qué el versículo suena así dentro de su escenario real.',
    contextPointLabel: 'Punto de contexto',
    contextTitle: 'Contexto',
    chooseContextMode: 'Elige un nivel de contexto',
    readThisVerseThroughContext: 'Mira este versículo dentro de un marco más amplio.',
    paragraph: 'Párrafo',
    bookMode: 'Libro',
    bibleMode: 'Biblia',
    paragraphHelper: 'El flujo inmediato alrededor del versículo',
    bookHelper: 'Cómo funciona dentro del libro',
    bibleHelper: 'Cómo conecta con toda la Biblia',
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
    contextPoint1: 'Elige el párrafo inmediato alrededor del versículo.',
    contextPoint2: 'Elige el movimiento y propósito del libro.',
    contextPoint3: 'Elige conexiones y ecos a nivel de toda la Biblia.',
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
      'Siguiendo las fuerzas inmediatas, el flujo y el marco que afinan la lectura del versículo…',
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
      'Ce mode ne montrera que le contexte qui change réellement la lecture du verset.',
    contextTakeaway:
      'Le contexte doit expliquer pourquoi le verset sonne ainsi dans son cadre réel.',
    contextPointLabel: 'Point de contexte',
    contextTitle: 'Contexte',
    chooseContextMode: 'Choisissez un niveau de contexte',
    readThisVerseThroughContext: 'Voyez ce verset dans un cadre plus large.',
    paragraph: 'Paragraphe',
    bookMode: 'Livre',
    bibleMode: 'Bible',
    paragraphHelper: 'Le mouvement immédiat autour du verset',
    bookHelper: 'Comment il fonctionne dans le livre',
    bibleHelper: 'Comment il se relie à toute la Bible',
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
    contextPoint1: 'Choisissez le paragraphe immédiat autour du verset.',
    contextPoint2: 'Choisissez le mouvement et le but du livre.',
    contextPoint3: 'Choisissez les liens et échos dans toute la Bible.',
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
      'Repérage des forces immédiates, du mouvement et du cadre qui affinent la lecture du verset…',
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
      'Dieser Modus zeigt nur den Kontext, der die Lesart des Verses wirklich verändert.',
    contextTakeaway:
      'Der Kontext soll erklären, warum der Vers in seinem echten Rahmen so klingt.',
    contextPointLabel: 'Kontextpunkt',
    contextTitle: 'Kontext',
    chooseContextMode: 'Wähle eine Kontextebene',
    readThisVerseThroughContext: 'Sieh den Vers in einem größeren Rahmen.',
    paragraph: 'Abschnitt',
    bookMode: 'Buch',
    bibleMode: 'Bibel',
    paragraphHelper: 'Der unmittelbare Fluss um den Vers',
    bookHelper: 'Wie er im Buch funktioniert',
    bibleHelper: 'Wie er mit der ganzen Bibel verbunden ist',
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
    contextPoint1: 'Wähle den unmittelbaren Abschnitt um den Vers.',
    contextPoint2: 'Wähle Bewegung und Ziel des Buches.',
    contextPoint3: 'Wähle Verbindungen und Echos in der ganzen Bibel.',
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
      'Unmittelbare Kräfte, Bewegungen und Rahmen werden verfolgt, die die Lesart des Verses schärfen…',
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

  const [wordLensLoading, setWordLensLoading] = useState(false)
  const [wordLensError, setWordLensError] = useState('')
  const [tensionLensLoading, setTensionLensLoading] = useState(false)
  const [tensionLensError, setTensionLensError] = useState('')
  const [phraseLensLoading, setPhraseLensLoading] = useState(false)
  const [phraseLensError, setPhraseLensError] = useState('')

  const [appLanguage, setAppLanguage] = useState<AppLanguage>('en')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [translatedCards, setTranslatedCards] = useState<Record<string, InsightItem>>({})

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
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
  const wordLensRequestIdRef = useRef(0)
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
      setWordLensError('')
      setTensionLensError('')
      setPhraseLensError('')
      setCurrentIndex(0)
      setTranslationLoading(false)
      setTranslationError('')
      setTranslatedCards({})
      setCopyStatus('idle')
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
      wordLensRequestIdRef.current += 1
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
    if (activeTab === 'lens' && selectedLens === 'word') {
      return wordLensCardsByLanguage[appLanguage] || []
    }
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
    wordLensCardsByLanguage,
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
    if (!force && wordLensCardsByLanguage[language]?.length > 0) return

    const requestId = ++wordLensRequestIdRef.current

    setWordLensLoading(true)
    setWordLensError('')
    setCurrentIndex(0)
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/word-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
        }),
      })

      const data: LensApiResponse = await res.json()

      if (requestId !== wordLensRequestIdRef.current) return

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setWordLensError(data.error || UI_TEXT[language].wordLensUnavailable)
        setWordLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
        return
      }

      setWordLensCardsByLanguage((prev) => ({ ...prev, [language]: data.cards as InsightItem[] }))
    } catch {
      if (requestId !== wordLensRequestIdRef.current) return
      setWordLensError(UI_TEXT[language].wordLensUnavailable)
      setWordLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
    } finally {
      if (requestId === wordLensRequestIdRef.current) {
        setWordLensLoading(false)
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

      const data: LensApiResponse = await res.json()

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

      const data: LensApiResponse = await res.json()

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
    if (!formattedReference || !verseText || !modesReady) return
    if (!force && contextByLanguage[language]) return

    const requestId = ++contextRequestIdRef.current

    setContextLoading(true)
    setContextError('')
    setActiveArticleKey('')

    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: language,
          contextMode: selectedContext ?? 'paragraph',
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

  useEffect(() => {
    if (!formattedReference || !verseText || !modesReady) return

    if (activeTab === 'context' && selectedContext) void loadContext(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'translation') void loadCompare(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'word') void loadWordLens(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'tension') void loadTensionLens(false, appLanguage)
    if (activeTab === 'lens' && selectedLens === 'phrase') void loadPhraseLens(false, appLanguage)
  }, [activeTab, selectedContext, selectedLens, appLanguage, formattedReference, verseText, modesReady])

  async function handleSetLanguage(targetLanguage: AppLanguage) {
    if (interactionsLocked) return

    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setCompareCopyStatus('idle')
    setCompareShareStatus('')
    setContextCopyStatus('idle')
    setContextShareStatus('')

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

  async function handleCopy() {
    if (!shareText || interactionsLocked) return

    try {
      await navigator.clipboard.writeText(shareText)
      setCopyStatus('copied')
      setShareStatus('')

      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopyStatus('idle')
      }, 1600)
    } catch {
      setCopyStatus('failed')
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
          setCopyStatus('idle')
          return
        }
      }

      if (navigator.share) {
        await navigator.share({ text: shareText })
        setShareStatus(t.sharedAsText)
        setCopyStatus('idle')
      } else {
        await navigator.clipboard.writeText(shareText)
        setShareStatus(t.shareUnavailableCopiedInstead)
        setCopyStatus('idle')
      }
    } catch {
      setShareStatus('')
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

  function renderStructuredPanel(
    title: string,
    lead: string,
    labelPrefix: string,
    points: string[],
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
              {t.takeaway}
            </p>
            <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{takeaway}</p>
          </div>
        </div>
      </div>
    )
  }

  function renderArticleView() {
    if (!(activeArticleKey && activeArticleJob?.status === 'ready' && activeArticleJob.article)) {
      return null
    }

    return (
      <div className="card-pop mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveArticleKey('')
                setArticleShareStatus('')
                setArticleCopyStatus('idle')
                if (articleTopRef.current) {
                  articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.backToCards}
            </button>

            <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.article}
            </span>
          </div>

          <p className="mb-3 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {activeArticleJob.reference}
          </p>

          <h2 className="mb-6 text-center text-[2.15rem] font-semibold leading-tight tracking-tight text-stone-900">
            {activeArticleJob.article.title}
          </h2>

          <p className="mb-8 text-[1.1rem] leading-9 text-stone-900">
            {activeArticleJob.article.lead}
          </p>

          {activeArticleJob.article.quote ? (
            <blockquote className="mb-8 border-l-2 border-stone-300 pl-4 text-[1rem] italic leading-8 text-stone-700">
              {activeArticleJob.article.quote}
            </blockquote>
          ) : null}

          <div className="space-y-7 text-[0.98rem] leading-8 text-stone-800">
            {activeArticleJob.article.body.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyArticle}
              className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {articleCopyStatus === 'copied'
                ? t.copied
                : articleCopyStatus === 'failed'
                  ? t.copyFailed
                  : t.copyArticle}
            </button>

            <button
              type="button"
              onClick={handleShareArticle}
              className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.shareArticle}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveArticleKey('')
                setArticleShareStatus('')
                setArticleCopyStatus('idle')
                if (articleTopRef.current) {
                  articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.backToCards}
            </button>

            <Link
              href="/"
              className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-center text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.home}
            </Link>
          </div>

          {articleShareStatus && (
            <p className="mt-3 text-center text-sm text-stone-500">{articleShareStatus}</p>
          )}
        </div>
      </div>
    )
  }

  function renderCardStackView() {
    if (activeArticleKey && activeArticleJob?.status === 'ready' && activeArticleJob.article) {
      return renderArticleView()
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

    if (insightsError && insights.length === 0) {
      return (
        <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.unableToLoad}
            </p>
            <p className="mb-4 text-[1.08rem] leading-9 text-stone-800">{insightsError}</p>

            <button
              type="button"
              onClick={() => {
                void loadInsightsTwoPhase()
              }}
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
        {currentCards.length > 0 && !activeArticleKey && (
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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="card-pop rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]"
        >
          {displayedCard ? (
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              {activeTab === 'lens' && selectedLens && (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#fffaf1]/80 px-3 py-1.5 text-sm font-medium text-stone-600 shadow-[0_4px_12px_rgba(94,72,37,0.06)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                    <span>
                      {selectedLens === 'translation'
                        ? t.translation
                        : selectedLens === 'word'
                          ? t.word
                          : selectedLens === 'tension'
                            ? t.tension
                            : t.phrase}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLensSheetOpen(true)}
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
                    <span>
                      {selectedContext === 'paragraph'
                        ? t.paragraph
                        : selectedContext === 'book'
                          ? t.bookMode
                          : t.bibleMode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContextSheetOpen(true)}
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
                  onClick={handleUnfold}
                  disabled={currentArticleJob?.status === 'generating'}
                  className={`rounded-full border px-5 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all duration-200 ease-out disabled:opacity-60 active:scale-[0.985] ${
                    currentArticleJob?.status === 'ready'
                      ? 'border-[#a58a57] bg-[linear-gradient(180deg,#efe2bf_0%,#e5d3a8_100%)] text-stone-900 shadow-[0_10px_22px_rgba(94,72,37,0.14)] hover:brightness-[0.99]'
                      : currentArticleJob?.status === 'generating'
                        ? 'border-stone-300 bg-[linear-gradient(180deg,#f5ecda_0%,#ecdfc1_100%)] text-stone-600 shadow-[0_8px_18px_rgba(94,72,37,0.08)]'
                        : 'border-[#7b6540] bg-[linear-gradient(180deg,#5f4d31_0%,#4b3b24_100%)] text-[#fbf6ea] shadow-[0_14px_28px_rgba(60,44,21,0.22)] hover:translate-y-[-1px] hover:shadow-[0_18px_34px_rgba(60,44,21,0.26)]'
                  }`}
                >
                  {currentArticleJob?.status === 'generating'
                    ? t.generating
                    : currentArticleJob?.status === 'ready'
                      ? t.openArticle
                      : t.unfold}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-full border border-stone-300/90 bg-[linear-gradient(180deg,rgba(255,250,241,0.96)_0%,rgba(248,239,220,0.9)_100%)] px-5 py-2.5 text-sm font-medium text-stone-700 shadow-[0_8px_18px_rgba(94,72,37,0.08)] transition-all duration-200 ease-out hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,rgba(255,250,241,1)_0%,rgba(245,233,207,0.96)_100%)] hover:shadow-[0_12px_24px_rgba(94,72,37,0.12)] active:scale-[0.985]"
                >
                  {t.share}
                </button>
              </div>

              {currentArticleJob?.status === 'failed' && currentArticleJob.error && (
                <p className="mt-3 text-center text-sm text-red-700">{currentArticleJob.error}</p>
              )}

              {currentArticleJob?.status === 'ready' && (
                <p className="mt-3 text-center text-sm text-stone-500">{t.articleReady}</p>
              )}

              {shareStatus && (
                <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>
              )}

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
              onClick={handlePrev}
              className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-base font-medium text-stone-800 shadow-[0_8px_18px_rgba(28,25,23,0.08)] transition hover:bg-[#f8efdc]"
            >
              {t.previous}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-[24px] bg-stone-900 px-4 py-4 text-base font-medium text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.18)] transition hover:bg-stone-800"
            >
              {t.next}
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderCompareView() {
    if (!modesReady) {
      return renderStructuredPanel(
        t.translations,
        t.translationsLead,
        t.translationsDiffLabel,
        [t.translationsPoint1, t.translationsPoint2, t.translationsPoint3],
        t.translationsTakeaway
      )
    }

    if (compareLoading) {
      return (
        <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.loadingTranslations}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{t.loadingTranslationsText}</p>
          </div>
        </div>
      )
    }

    if (compareError) {
      return (
        <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.translations}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{compareError}</p>

            <button
              type="button"
              onClick={() => loadCompare(true, appLanguage)}
              className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      )
    }

    if (!compareData) {
      return renderStructuredPanel(
        t.translations,
        t.translationsLead,
        t.translationsDiffLabel,
        [t.translationsPoint1, t.translationsPoint2, t.translationsPoint3],
        t.translationsTakeaway
      )
    }

    return (
      <div className="tab-panel-enter card-pop mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {t.translations}
          </p>

          <p className="text-[1rem] leading-8 text-stone-800">{compareData.lead}</p>

          <div className="mt-5 space-y-4">
            {compareData.points.map((point, index) => (
              <div
                key={`${point.title}-${index}`}
                className="rounded-[20px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {point.title}
                </p>

                <div className="mt-3 space-y-3">
                  <div className="rounded-[16px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {point.labelA}
                    </p>
                    <p className="mt-1 text-[1rem] leading-7 text-stone-900">“{point.quoteA}”</p>
                  </div>

                  <div className="rounded-[16px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {point.labelB}
                    </p>
                    <p className="mt-1 text-[1rem] leading-7 text-stone-900">“{point.quoteB}”</p>
                  </div>
                </div>

                <p className="mt-4 text-[0.97rem] leading-7 text-stone-800">{point.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              {t.takeaway}
            </p>
            <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{compareData.takeaway}</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleCompareBackToTop}
              className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.backToTop}
            </button>

            <button
              type="button"
              onClick={handleCopyCompare}
              className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {compareCopyStatus === 'copied'
                ? t.copiedAnalysis
                : compareCopyStatus === 'failed'
                  ? t.copyFailed
                  : t.copyAnalysis}
            </button>

            <button
              type="button"
              onClick={handleShareCompare}
              className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.shareAnalysis}
            </button>
          </div>

          {compareShareStatus && (
            <p className="mt-3 text-center text-sm text-stone-500">{compareShareStatus}</p>
          )}
        </div>
      </div>
    )
  }

  function renderContextModeIntro() {
    return renderStructuredPanel(
      t.contextTitle,
      t.contextLead,
      t.contextPointLabel,
      [t.contextPoint1, t.contextPoint2, t.contextPoint3],
      t.contextTakeaway
    )
  }

  function renderContextView() {
    if (!modesReady) {
      return renderContextModeIntro()
    }

    if (!selectedContext) {
      return renderContextModeIntro()
    }

    if (contextLoading) {
      return (
        <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.loadingContext}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{t.loadingContextText}</p>
          </div>
        </div>
      )
    }

    if (contextError) {
      return (
        <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#fffaf1]/80 px-3 py-1.5 text-sm font-medium text-stone-600 shadow-[0_4px_12px_rgba(94,72,37,0.06)]">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <span>
                  {selectedContext === 'paragraph'
                    ? t.paragraph
                    : selectedContext === 'book'
                      ? t.bookMode
                      : t.bibleMode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setContextSheetOpen(true)}
                className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
              >
                {t.change}
              </button>
            </div>

            <p className="text-[1.08rem] leading-9 text-stone-800">{contextError}</p>

            <button
              type="button"
              onClick={() => loadContext(true, appLanguage)}
              className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      )
    }

    if (!contextData) {
      return renderContextModeIntro()
    }

    return (
      <div className="tab-panel-enter card-pop mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-[#fffaf1]/80 px-3 py-1.5 text-sm font-medium text-stone-600 shadow-[0_4px_12px_rgba(94,72,37,0.06)]">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              <span>
                {selectedContext === 'paragraph'
                  ? t.paragraph
                  : selectedContext === 'book'
                    ? t.bookMode
                    : t.bibleMode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setContextSheetOpen(true)}
              className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
            >
              {t.change}
            </button>
          </div>

          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {t.context}
          </p>

          <p className="text-[1rem] leading-8 text-stone-800">{contextData.lead}</p>

          <div className="mt-5 space-y-4">
            {contextData.points.map((point, index) => (
              <div
                key={`${point.title}-${index}`}
                className="rounded-[20px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {point.title}
                </p>
                <p className="mt-3 text-[0.97rem] leading-7 text-stone-800">{point.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              {t.takeaway}
            </p>
            <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{contextData.takeaway}</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleContextBackToTop}
              className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.backToTop}
            </button>

            <button
              type="button"
              onClick={handleCopyContext}
              className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {contextCopyStatus === 'copied'
                ? t.copiedAnalysis
                : contextCopyStatus === 'failed'
                  ? t.copyFailed
                  : t.copyAnalysis}
            </button>

            <button
              type="button"
              onClick={handleShareContext}
              className="rounded-[20px] border border-stone-300 bg-[#fffaf1] px-3 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              {t.shareAnalysis}
            </button>
          </div>

          {contextShareStatus && (
            <p className="mt-3 text-center text-sm text-stone-500">{contextShareStatus}</p>
          )}
        </div>
      </div>
    )
  }

  function renderLensModeIntro() {
    return renderStructuredPanel(
      t.lens,
      t.lensLeadDefault,
      t.lensPointLabel,
      [t.translation, t.word, t.tension, t.phrase],
      t.lensTakeawayDefault
    )
  }

  function renderLensView() {
    if (!modesReady) {
      return renderLensModeIntro()
    }

    if (selectedLens === 'translation') {
      return renderCompareView()
    }

    if (selectedLens === 'word') {
      if (wordLensLoading) {
        return (
          <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                {t.loadingWordLens}
              </p>
              <p className="text-[1.08rem] leading-9 text-stone-800">{t.loadingWordLensText}</p>
            </div>
          </div>
        )
      }

      if (wordLensError) {
        return (
          <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-500">
                  {t.lensLabel}: {t.word}
                </p>
                <button
                  type="button"
                  onClick={() => setLensSheetOpen(true)}
                  className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
                >
                  {t.change}
                </button>
              </div>

              <p className="text-[1.08rem] leading-9 text-stone-800">{wordLensError}</p>

              <button
                type="button"
                onClick={() => loadWordLens(true, appLanguage)}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )
      }

      return renderCardStackView()
    }

    if (selectedLens === 'tension') {
      if (tensionLensLoading) {
        return (
          <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                {t.loadingTensionLens}
              </p>
              <p className="text-[1.08rem] leading-9 text-stone-800">
                {t.loadingTensionLensText}
              </p>
            </div>
          </div>
        )
      }

      if (tensionLensError) {
        return (
          <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-500">
                  {t.lensLabel}: {t.tension}
                </p>
                <button
                  type="button"
                  onClick={() => setLensSheetOpen(true)}
                  className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
                >
                  {t.change}
                </button>
              </div>

              <p className="text-[1.08rem] leading-9 text-stone-800">{tensionLensError}</p>

              <button
                type="button"
                onClick={() => loadTensionLens(true, appLanguage)}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )
      }

      return renderCardStackView()
    }

    if (selectedLens === 'phrase') {
      if (phraseLensLoading) {
        return (
          <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                {t.loadingPhraseLens}
              </p>
              <p className="text-[1.08rem] leading-9 text-stone-800">
                {t.loadingPhraseLensText}
              </p>
            </div>
          </div>
        )
      }

      if (phraseLensError) {
        return (
          <div className="tab-panel-enter mt-5 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-500">
                  {t.lensLabel}: {t.phrase}
                </p>
                <button
                  type="button"
                  onClick={() => setLensSheetOpen(true)}
                  className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
                >
                  {t.change}
                </button>
              </div>

              <p className="text-[1.08rem] leading-9 text-stone-800">{phraseLensError}</p>

              <button
                type="button"
                onClick={() => loadPhraseLens(true, appLanguage)}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )
      }

      return renderCardStackView()
    }

    return renderLensModeIntro()
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

        {!verseLoading && !verseError && activeTab === 'insights' && renderCardStackView()}
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
        paragraphLabel={t.paragraph}
        bookLabel={t.bookMode}
        bibleLabel={t.bibleMode}
        paragraphHelper={t.paragraphHelper}
        bookHelper={t.bookHelper}
        bibleHelper={t.bibleHelper}
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
