'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'

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

type InsightsApiResponse = {
  reference?: string
  verseText?: string
  focusWord?: string
  count?: number
  insights?: InsightItem[]
  error?: string
  raw?: string
}

type TranslateCardApiResponse = {
  targetLanguage?: 'ru' | 'es'
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

type AppLanguage = 'en' | 'ru' | 'es'
type ArticleJobStatus = 'idle' | 'generating' | 'ready' | 'failed'
type TopTab = 'insights' | 'compare' | 'context' | 'another-lens'
type LensKind = 'word' | 'tension' | 'phrase'

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
    compare: string
    context: string
    anotherLens: string

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

    compareLead: string
    compareTakeaway: string
    compareDiffLabel: string

    contextLead: string
    contextTakeaway: string
    contextPointLabel: string

    lensTitle: string
    chooseFocusedLens: string
    readThisVerseOneAngle: string
    close: string
    change: string

    word: string
    tension: string
    phrase: string

    wordHelper: string
    tensionHelper: string
    phraseHelper: string

    lensPointLabel: string
    takeaway: string

    lensLeadWord: string
    lensLeadTension: string
    lensLeadPhrase: string
    lensLeadDefault: string

    lensTakeawayWord: string
    lensTakeawayTension: string
    lensTakeawayPhrase: string
    lensTakeawayDefault: string

    point: string
    difference: string
    contextPoint: string

    lensPoint1Word: string
    lensPoint2Word: string
    lensPoint3Word: string

    lensPoint1Tension: string
    lensPoint2Tension: string
    lensPoint3Tension: string

    lensPoint1Phrase: string
    lensPoint2Phrase: string
    lensPoint3Phrase: string

    lensPoint1Default: string
    lensPoint2Default: string
    lensPoint3Default: string

    comparePoint1: string
    comparePoint2: string
    comparePoint3: string

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

    tryAgain: string
    lensLabel: string
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

    insights: 'Insights',
    compare: 'Compare',
    context: 'Context',
    anotherLens: 'Another Lens',

    loadingInsight: 'Loading insight',
    loadingInsightText: 'Please wait while the insight cards are generated.',
    unableToLoad: 'Unable to load',
    rawModelOutput: 'Raw model output',
    noInsight: 'No insight',
    noInsightText: 'No insight is available for this verse yet.',

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

    compareLead:
      'This mode will compare translation choices and surface where wording moves the reader’s attention in different directions.',
    compareTakeaway:
      'Compare should feel like a reading tool, not a raw list of translations.',
    compareDiffLabel: 'Difference',

    contextLead:
      'This mode will surface only the context that materially changes the reading of the verse.',
    contextTakeaway:
      'Context should clarify why the verse sounds the way it does inside its real setting.',
    contextPointLabel: 'Context point',

    lensTitle: 'Another Lens',
    chooseFocusedLens: 'Choose a focused lens',
    readThisVerseOneAngle: 'Read this verse through one angle.',
    close: 'Close',
    change: 'Change',

    word: 'Word',
    tension: 'Tension',
    phrase: 'Why This Phrase',

    wordHelper: 'Hidden weight of words',
    tensionHelper: 'What’s surprising here',
    phraseHelper: 'Why it is said this way',

    lensPointLabel: 'Lens point',
    takeaway: 'Takeaway',

    lensLeadWord:
      'Word will focus on the hidden weight of words, terms, and small textual units.',
    lensLeadTension:
      'Tension will look for what is surprising, pressured, or internally contrasted in the verse.',
    lensLeadPhrase:
      'Why This Phrase will ask why the verse is said in this exact way, and what is gained by that form.',
    lensLeadDefault: 'Choose a focused lens to read this verse through one angle.',

    lensTakeawayWord:
      'Word should reveal hidden textual weight without turning into a dry lexicon.',
    lensTakeawayTension:
      'Tension should surface real internal pressure in the verse, not invented drama.',
    lensTakeawayPhrase:
      'Why This Phrase should explain why the wording itself carries meaning.',
    lensTakeawayDefault:
      'Another Lens is the focused-reading family, not just a reroll button.',

    point: 'Point',
    difference: 'Difference',
    contextPoint: 'Context point',

    lensPoint1Word:
      'This lens will stay close to words and textual units, not generic reflections.',
    lensPoint2Word:
      'It will highlight hidden weight, verbal force, and meaningful small shifts.',
    lensPoint3Word: 'It should feel like close reading, not dictionary trivia.',

    lensPoint1Tension:
      'This lens will localize where the tension actually lives in the verse.',
    lensPoint2Tension:
      'It will avoid vague “pseudo-depth” and stay anchored in the text.',
    lensPoint3Tension:
      'It should surface the most surprising pressure point in the wording.',

    lensPoint1Phrase:
      'This lens will treat the phrase as a shaped form, not just a container of words.',
    lensPoint2Phrase:
      'It will ask what would be lost if the verse were said more simply.',
    lensPoint3Phrase:
      'It should feel like disciplined close reading, not airy rhetoric.',

    lensPoint1Default: 'Choose Word, Tension, or Why This Phrase.',
    lensPoint2Default: 'Each lens will become a focused reading mode.',
    lensPoint3Default: 'This screen is ready; the lens content comes next.',

    comparePoint1: 'A short lead will name the main translation tension in the verse.',
    comparePoint2:
      'The final version will show 3–5 compact comparison points instead of one dense block.',
    comparePoint3:
      'A short takeaway will explain why those differences matter for reading the verse.',

    contextPoint1:
      'The final version will identify the main context type that matters most here.',
    contextPoint2:
      'It will present 3–5 compact context points, not a heavy encyclopedia panel.',
    contextPoint3:
      'A final takeaway will explain how context changes the force of the verse.',

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
    loadingPhraseLensText:
      'Reading the verse through the force of its exact phrasing…',
    phraseLensUnavailable: 'Unable to load Why This Phrase lens.',

    tryAgain: 'Try again',
    lensLabel: 'Lens',
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

    insights: 'Инсайты',
    compare: 'Сравнение',
    context: 'Контекст',
    anotherLens: 'Другая линза',

    loadingInsight: 'Загрузка инсайта',
    loadingInsightText: 'Подождите, пока генерируются карточки инсайтов.',
    unableToLoad: 'Не удалось загрузить',
    rawModelOutput: 'Сырой вывод модели',
    noInsight: 'Нет инсайта',
    noInsightText: 'Для этого стиха пока нет доступного инсайта.',

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

    compareLead:
      'Этот режим будет сравнивать переводческие решения и показывать, как формулировка направляет внимание читателя в разные стороны.',
    compareTakeaway:
      'Сравнение должно ощущаться как инструмент чтения, а не как сырой список переводов.',
    compareDiffLabel: 'Различие',

    contextLead:
      'Этот режим будет показывать только тот контекст, который реально меняет чтение стиха.',
    contextTakeaway:
      'Контекст должен объяснять, почему стих звучит именно так в своей реальной среде.',
    contextPointLabel: 'Пункт контекста',

    lensTitle: 'Другая линза',
    chooseFocusedLens: 'Выберите сфокусированную линзу',
    readThisVerseOneAngle: 'Посмотрите на этот стих под одним углом.',
    close: 'Закрыть',
    change: 'Изменить',

    word: 'Слово',
    tension: 'Напряжение',
    phrase: 'Почему именно эта фраза',

    wordHelper: 'Скрытый вес слов',
    tensionHelper: 'Что здесь неожиданно',
    phraseHelper: 'Почему это сказано именно так',

    lensPointLabel: 'Пункт линзы',
    takeaway: 'Вывод',

    lensLeadWord:
      'Линза «Слово» сосредоточится на скрытом весе слов, терминов и малых текстовых единиц.',
    lensLeadTension:
      'Линза «Напряжение» будет искать то, что в стихе удивляет, напрягает или внутренне контрастирует.',
    lensLeadPhrase:
      'Линза «Почему именно эта фраза» спросит, почему стих сформулирован именно так и что даёт эта форма.',
    lensLeadDefault:
      'Выберите сфокусированную линзу, чтобы посмотреть на этот стих под одним углом.',

    lensTakeawayWord:
      'Линза «Слово» должна раскрывать скрытый текстовый вес, не превращаясь в сухой лексикон.',
    lensTakeawayTension:
      'Линза «Напряжение» должна находить реальное внутреннее напряжение стиха, а не выдуманную драму.',
    lensTakeawayPhrase:
      'Линза «Почему именно эта фраза» должна объяснять, почему сама формулировка несёт смысл.',
    lensTakeawayDefault:
      '«Другая линза» — это семейство сфокусированного чтения, а не просто кнопка reroll.',

    point: 'Пункт',
    difference: 'Различие',
    contextPoint: 'Пункт контекста',

    lensPoint1Word:
      'Эта линза должна держаться слов и текстовых единиц, а не уходить в общие размышления.',
    lensPoint2Word:
      'Она будет выделять скрытый вес, силу глагола и значимые малые сдвиги.',
    lensPoint3Word:
      'Она должна ощущаться как close reading, а не как словарная справка.',

    lensPoint1Tension:
      'Эта линза должна точно локализовать, где именно в стихе живёт напряжение.',
    lensPoint2Tension:
      'Она должна избегать псевдоглубины и оставаться привязанной к тексту.',
    lensPoint3Tension:
      'Она должна показывать самую неожиданную точку напряжения в формулировке.',

    lensPoint1Phrase:
      'Эта линза должна читать фразу как сформированную форму, а не просто как контейнер слов.',
    lensPoint2Phrase:
      'Она должна спрашивать, что было бы потеряно, если бы стих был сказан проще.',
    lensPoint3Phrase:
      'Она должна ощущаться как дисциплинированное close reading, а не как воздушная риторика.',

    lensPoint1Default: 'Выберите «Слово», «Напряжение» или «Почему именно эта фраза».',
    lensPoint2Default: 'Каждая линза станет отдельным режимом сфокусированного чтения.',
    lensPoint3Default: 'Экран уже готов; содержимое линзы будет следующим шагом.',

    comparePoint1:
      'Короткий lead будет называть главное переводческое напряжение в стихе.',
    comparePoint2:
      'Финальная версия покажет 3–5 компактных различий вместо одного плотного блока.',
    comparePoint3:
      'Короткий вывод объяснит, почему эти различия важны для чтения стиха.',

    contextPoint1:
      'Финальная версия определит, какой тип контекста здесь важнее всего.',
    contextPoint2:
      'Она покажет 3–5 компактных пунктов контекста, а не тяжёлую энциклопедическую панель.',
    contextPoint3:
      'Итоговый вывод объяснит, как контекст меняет силу звучания стиха.',

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
    loadingPhraseLensText:
      'Смотрим на стих через силу его точной формулировки…',
    phraseLensUnavailable: 'Не удалось загрузить линзу «Почему именно эта фраза».',

    tryAgain: 'Попробовать снова',
    lensLabel: 'Линза',
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

    insights: 'Ideas',
    compare: 'Comparar',
    context: 'Contexto',
    anotherLens: 'Otra lente',

    loadingInsight: 'Cargando idea',
    loadingInsightText: 'Espera mientras se generan las tarjetas de ideas.',
    unableToLoad: 'No se pudo cargar',
    rawModelOutput: 'Salida bruta del modelo',
    noInsight: 'Sin idea',
    noInsightText: 'Todavía no hay una idea disponible para este versículo.',

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

    compareLead:
      'Este modo comparará decisiones de traducción y mostrará cómo la redacción dirige la atención del lector en distintas direcciones.',
    compareTakeaway:
      'Comparar debe sentirse como una herramienta de lectura, no como una lista bruta de traducciones.',
    compareDiffLabel: 'Diferencia',

    contextLead:
      'Este modo mostrará solo el contexto que realmente cambia la lectura del versículo.',
    contextTakeaway:
      'El contexto debe aclarar por qué el versículo suena así dentro de su escenario real.',
    contextPointLabel: 'Punto de contexto',

    lensTitle: 'Otra lente',
    chooseFocusedLens: 'Elige una lente enfocada',
    readThisVerseOneAngle: 'Lee este versículo desde un solo ángulo.',
    close: 'Cerrar',
    change: 'Cambiar',

    word: 'Palabra',
    tension: 'Tensión',
    phrase: 'Por qué esta frase',

    wordHelper: 'Peso oculto de las palabras',
    tensionHelper: 'Qué sorprende aquí',
    phraseHelper: 'Por qué se dice así',

    lensPointLabel: 'Punto de lente',
    takeaway: 'Conclusión',

    lensLeadWord:
      'Palabra se enfocará en el peso oculto de palabras, términos y pequeñas unidades textuales.',
    lensLeadTension:
      'Tensión buscará lo que sorprende, presiona o contrasta internamente en el versículo.',
    lensLeadPhrase:
      'Por qué esta frase preguntará por qué el versículo está dicho exactamente así y qué aporta esa forma.',
    lensLeadDefault:
      'Elige una lente enfocada para leer este versículo desde un solo ángulo.',

    lensTakeawayWord:
      'Palabra debe revelar peso textual oculto sin convertirse en un léxico seco.',
    lensTakeawayTension:
      'Tensión debe mostrar presión interna real en el versículo, no drama inventado.',
    lensTakeawayPhrase:
      'Por qué esta frase debe explicar por qué la formulación misma lleva significado.',
    lensTakeawayDefault:
      'Otra lente es la familia de lectura enfocada, no solo un botón de repetir.',

    point: 'Punto',
    difference: 'Diferencia',
    contextPoint: 'Punto de contexto',

    lensPoint1Word:
      'Esta lente debe mantenerse cerca de palabras y unidades textuales, no de reflexiones genéricas.',
    lensPoint2Word:
      'Destacará peso oculto, fuerza verbal y pequeños cambios significativos.',
    lensPoint3Word:
      'Debe sentirse como lectura cercana, no como trivia de diccionario.',

    lensPoint1Tension:
      'Esta lente debe localizar dónde vive realmente la tensión en el versículo.',
    lensPoint2Tension:
      'Debe evitar la “pseudo-profundidad” vaga y mantenerse anclada en el texto.',
    lensPoint3Tension:
      'Debe sacar a la luz el punto de tensión más sorprendente en la redacción.',

    lensPoint1Phrase:
      'Esta lente debe tratar la frase como una forma construida, no solo como un contenedor de palabras.',
    lensPoint2Phrase:
      'Debe preguntar qué se perdería si el versículo se dijera de forma más simple.',
    lensPoint3Phrase:
      'Debe sentirse como lectura cercana disciplinada, no como retórica vacía.',

    lensPoint1Default: 'Elige Palabra, Tensión o Por qué esta frase.',
    lensPoint2Default: 'Cada lente se convertirá en un modo de lectura enfocado.',
    lensPoint3Default: 'La pantalla ya está lista; el contenido de la lente viene después.',

    comparePoint1:
      'Un lead breve nombrará la tensión principal de traducción en el versículo.',
    comparePoint2:
      'La versión final mostrará 3–5 puntos de comparación compactos en vez de un bloque denso.',
    comparePoint3:
      'Una conclusión breve explicará por qué esas diferencias importan para leer el versículo.',

    contextPoint1:
      'La versión final identificará qué tipo de contexto importa más aquí.',
    contextPoint2:
      'Presentará 3–5 puntos de contexto compactos, no un panel enciclopédico pesado.',
    contextPoint3:
      'Una conclusión final explicará cómo el contexto cambia la fuerza del versículo.',

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

    tryAgain: 'Intentar de nuevo',
    lensLabel: 'Lente',
  },
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [verseText, setVerseText] = useState('')
  const [translatedVerseTexts, setTranslatedVerseTexts] = useState<Record<string, string>>({})

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [wordLensCards, setWordLensCards] = useState<InsightItem[]>([])
  const [tensionLensCards, setTensionLensCards] = useState<InsightItem[]>([])
  const [phraseLensCards, setPhraseLensCards] = useState<InsightItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

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

  const t = UI_TEXT[appLanguage]

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
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!book || !chapter || !verse) return

    async function loadInsights() {
      setLoading(true)
      setError('')
      setRawOutput('')
      setVerseText('')
      setInsights([])
      setWordLensCards([])
      setTensionLensCards([])
      setPhraseLensCards([])
      setWordLensError('')
      setTensionLensError('')
      setPhraseLensError('')
      setCurrentIndex(0)
      setTranslationLoading(false)
      setTranslationError('')
      setTranslatedCards({})
      setTranslatedVerseTexts({})
      setCopyStatus('idle')
      setShareStatus('')
      setActiveArticleKey('')
      setArticleShareStatus('')
      setArticleCopyStatus('idle')
      setActiveTab('insights')
      setSelectedLens(null)
      setLensSheetOpen(false)

      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book,
            chapter,
            verse,
            count: 12,
          }),
        })

        const data: InsightsApiResponse = await res.json()

        if (!res.ok) {
          setError(data.error || 'API request failed.')
          setRawOutput(data.raw || '')
          return
        }

        setVerseText(data.verseText || '')

        const receivedInsights = Array.isArray(data?.insights) ? data.insights : []

        if (receivedInsights.length > 0) {
          setInsights(receivedInsights)
        } else {
          setError(data.error || 'No insights returned.')
          setRawOutput(data.raw || '')
        }
      } catch {
        setError('Error loading insights.')
      } finally {
        setLoading(false)
      }
    }

    loadInsights()
  }, [book, chapter, verse])

  useEffect(() => {
    if (activeArticleKey && articleTopRef.current) {
      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeArticleKey])

  const currentCards = useMemo(() => {
    if (activeTab === 'another-lens' && selectedLens === 'word') {
      return wordLensCards
    }
    if (activeTab === 'another-lens' && selectedLens === 'tension') {
      return tensionLensCards
    }
    if (activeTab === 'another-lens' && selectedLens === 'phrase') {
      return phraseLensCards
    }
    return insights
  }, [activeTab, selectedLens, wordLensCards, tensionLensCards, phraseLensCards, insights])

  const currentInsight = useMemo(() => currentCards[currentIndex], [currentCards, currentIndex])

  const currentModeKey = useMemo(() => {
    if (activeTab === 'another-lens') {
      return `another-lens:${selectedLens ?? 'none'}`
    }
    return activeTab
  }, [activeTab, selectedLens])

  const currentCardKey = useMemo(() => {
    if (!currentInsight) return ''
    return `${currentModeKey}:${currentIndex}:${currentInsight.title}:${currentInsight.text}`
  }, [currentModeKey, currentIndex, currentInsight])

  const verseTranslationKey = useMemo(() => {
    if (!verseText) return ''
    return `${book}:${chapter}:${verse}:${verseText}`
  }, [book, chapter, verse, verseText])

  async function translateCard(targetLanguage: 'ru' | 'es', card: InsightItem, cardKey: string) {
    const existingTranslation = translatedCards[`${targetLanguage}:${cardKey}`]
    if (existingTranslation) return existingTranslation

    const res = await fetch('/api/translate-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  async function translateVerseText(targetLanguage: 'ru' | 'es', text: string, key: string) {
    const existing = translatedVerseTexts[`${targetLanguage}:${key}`]
    if (existing) return existing

    const res = await fetch('/api/translate-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  async function ensureCurrentCardTranslated(targetLanguage: 'ru' | 'es') {
    if (!currentInsight || !currentCardKey) return

    setTranslationLoading(true)
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setActiveArticleKey('')

    try {
      await Promise.all([
        translateCard(targetLanguage, currentInsight, currentCardKey),
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
  }

  async function handleTranslateToRussian() {
    await ensureCurrentCardTranslated('ru')
  }

  async function handleTranslateToSpanish() {
    await ensureCurrentCardTranslated('es')
  }

  function handleShowOriginal() {
    setAppLanguage('en')
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setActiveArticleKey('')
  }

  async function goToIndex(nextIndex: number) {
    if (currentCards.length === 0) return

    setCurrentIndex(nextIndex)
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setActiveArticleKey('')

    if (appLanguage === 'en') return

    const nextInsight = currentCards[nextIndex]
    if (!nextInsight) return

    const nextCardKey = `${currentModeKey}:${nextIndex}:${nextInsight.title}:${nextInsight.text}`
    const tasks: Promise<unknown>[] = []

    if (!translatedCards[`${appLanguage}:${nextCardKey}`]) {
      tasks.push(translateCard(appLanguage, nextInsight, nextCardKey))
    }

    if (
      verseText &&
      verseTranslationKey &&
      !translatedVerseTexts[`${appLanguage}:${verseTranslationKey}`]
    ) {
      tasks.push(translateVerseText(appLanguage, verseText, verseTranslationKey))
    }

    if (tasks.length === 0) return

    setTranslationLoading(true)

    try {
      await Promise.all(tasks)
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
    } finally {
      setTranslationLoading(false)
    }
  }

  async function handleNext() {
    if (currentCards.length === 0) return
    const nextIndex = (currentIndex + 1) % currentCards.length
    await goToIndex(nextIndex)
  }

  async function handlePrev() {
    if (currentCards.length === 0) return
    const prevIndex = (currentIndex - 1 + currentCards.length) % currentCards.length
    await goToIndex(prevIndex)
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

    if (Math.abs(deltaX) < threshold) return

    if (deltaX < 0) {
      await handleNext()
    } else {
      await handlePrev()
    }
  }

  const displayedCard = useMemo(() => {
    if (!currentInsight || !currentCardKey) return null
    if (appLanguage === 'en') return currentInsight
    return translatedCards[`${appLanguage}:${currentCardKey}`] || currentInsight
  }, [currentInsight, currentCardKey, translatedCards, appLanguage])

  const displayedVerseText = useMemo(() => {
    if (appLanguage === 'en') return verseText
    if (!verseTranslationKey) return verseText
    return translatedVerseTexts[`${appLanguage}:${verseTranslationKey}`] || verseText
  }, [appLanguage, verseText, verseTranslationKey, translatedVerseTexts])

  const formattedReference = useMemo(() => {
    if (!book || !chapter || !verse) return ''
    return `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}`
  }, [book, chapter, verse])

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
    if (!displayedCard || !formattedReference || !displayedVerseText || !articleJobKey) return

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

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }

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
    if (!shareText) return

    try {
      await navigator.clipboard.writeText(shareText)
      setCopyStatus('copied')
      setShareStatus('')

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopyStatus('idle')
      }, 1600)
    } catch {
      setCopyStatus('failed')
    }
  }

  async function handleShare() {
    if (!displayedCard || !formattedReference) return

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

  async function loadWordLens(force = false) {
    if (!formattedReference || !verseText) return
    if (!force && wordLensCards.length > 0) return

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
          targetLanguage: appLanguage,
        }),
      })

      const data: LensApiResponse = await res.json()

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setWordLensError(data.error || t.wordLensUnavailable)
        setWordLensCards([])
        return
      }

      setWordLensCards(data.cards)
    } catch {
      setWordLensError(t.wordLensUnavailable)
      setWordLensCards([])
    } finally {
      setWordLensLoading(false)
    }
  }

  async function loadTensionLens(force = false) {
    if (!formattedReference || !verseText) return
    if (!force && tensionLensCards.length > 0) return

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
          targetLanguage: appLanguage,
        }),
      })

      const data: LensApiResponse = await res.json()

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setTensionLensError(data.error || t.tensionLensUnavailable)
        setTensionLensCards([])
        return
      }

      setTensionLensCards(data.cards)
    } catch {
      setTensionLensError(t.tensionLensUnavailable)
      setTensionLensCards([])
    } finally {
      setTensionLensLoading(false)
    }
  }

  async function loadPhraseLens(force = false) {
    if (!formattedReference || !verseText) return
    if (!force && phraseLensCards.length > 0) return

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
          targetLanguage: appLanguage,
        }),
      })

      const data: LensApiResponse = await res.json()

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setPhraseLensError(data.error || t.phraseLensUnavailable)
        setPhraseLensCards([])
        return
      }

      setPhraseLensCards(data.cards)
    } catch {
      setPhraseLensError(t.phraseLensUnavailable)
      setPhraseLensCards([])
    } finally {
      setPhraseLensLoading(false)
    }
  }

  async function handleSelectLens(lens: LensKind) {
    setSelectedLens(lens)
    setLensSheetOpen(false)
    setActiveTab('another-lens')
    setActiveArticleKey('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setCurrentIndex(0)

    if (lens === 'word') {
      await loadWordLens()
    }

    if (lens === 'tension') {
      await loadTensionLens()
    }

    if (lens === 'phrase') {
      await loadPhraseLens()
    }
  }

  function renderTabButton(label: string, isActive: boolean, onClick: () => void) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
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
    takeaway: string,
    extraAction?: React.ReactNode
  ) {
    return (
      <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {title}
            </p>
            {extraAction}
          </div>

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

  const copyButtonClass =
    copyStatus === 'copied'
      ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
      : copyStatus === 'failed'
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'

  const unfoldButtonLabel =
    currentArticleJob?.status === 'generating'
      ? t.generating
      : currentArticleJob?.status === 'ready'
        ? t.openArticle
        : t.unfold

  const unfoldButtonClass =
    currentArticleJob?.status === 'ready'
      ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
      : currentArticleJob?.status === 'generating'
        ? 'border-stone-300 bg-[#f3ebd7] text-stone-600'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'

  function renderLiveLensCardView() {
    return (
      <div className="tab-panel-enter">
        {!loading && currentCards.length > 0 && !activeArticleKey && (
          <p className="mb-4 text-sm font-medium text-stone-500">
            {currentIndex + 1} / {currentCards.length}
          </p>
        )}

        {activeArticleKey && activeArticleJob?.status === 'ready' && activeArticleJob.article ? (
          <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
        ) : (
          <>
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]"
            >
              {displayedCard ? (
                <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-stone-500">
                      {t.lensLabel}:{' '}
                      {selectedLens === 'word'
                        ? t.word
                        : selectedLens === 'tension'
                          ? t.tension
                          : t.phrase}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLensSheetOpen(true)}
                      className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
                    >
                      {t.change}
                    </button>
                  </div>

                  <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {formattedReference}
                  </p>

                  {displayedVerseText && (
                    <div className="mb-6 rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-5 py-4">
                      <p className="text-[1rem] leading-8 text-stone-700 italic">
                        {displayedVerseText}
                      </p>
                    </div>
                  )}

                  <h2 className="mb-5 text-center text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
                    {displayedCard.title}
                  </h2>

                  <p className="text-[1.08rem] leading-9 text-stone-800">{displayedCard.text}</p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleUnfold}
                      disabled={currentArticleJob?.status === 'generating'}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${unfoldButtonClass}`}
                    >
                      {unfoldButtonLabel}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${copyButtonClass}`}
                    >
                      {copyStatus === 'copied'
                        ? t.copied
                        : copyStatus === 'failed'
                          ? t.copyFailed
                          : t.copy}
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                    >
                      {t.share}
                    </button>
                  </div>

                  {currentArticleJob?.status === 'failed' && currentArticleJob.error && (
                    <p className="mt-3 text-center text-sm text-red-700">
                      {currentArticleJob.error}
                    </p>
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

            {!loading && currentCards.length > 1 && (
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
          </>
        )}
      </div>
    )
  }

  function renderInsightsView() {
    return (
      <div className="tab-panel-enter">
        {!loading && currentCards.length > 0 && !activeArticleKey && (
          <p className="mb-4 text-sm font-medium text-stone-500">
            {currentIndex + 1} / {currentCards.length}
          </p>
        )}

        {activeArticleKey && activeArticleJob?.status === 'ready' && activeArticleJob.article ? (
          <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
        ) : (
          <>
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]"
            >
              {loading ? (
                <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
                  <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {t.loadingInsight}
                  </p>
                  <p className="text-[1.08rem] leading-9 text-stone-800">{t.loadingInsightText}</p>
                </div>
              ) : error ? (
                <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
                  <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {t.unableToLoad}
                  </p>
                  <p className="mb-4 text-[1.08rem] leading-9 text-stone-800">{error}</p>

                  {rawOutput && (
                    <div className="rounded-2xl border border-stone-300/50 bg-[#fffaf0] p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        {t.rawModelOutput}
                      </p>
                      <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                        {rawOutput}
                      </pre>
                    </div>
                  )}
                </div>
              ) : displayedCard ? (
                <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
                  <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {formattedReference}
                  </p>

                  {displayedVerseText && (
                    <div className="mb-6 rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-5 py-4">
                      <p className="text-[1rem] leading-8 text-stone-700 italic">
                        {displayedVerseText}
                      </p>
                    </div>
                  )}

                  <h2 className="mb-5 text-center text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
                    {displayedCard.title}
                  </h2>

                  <p className="text-[1.08rem] leading-9 text-stone-800">{displayedCard.text}</p>

                  <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleUnfold}
                      disabled={currentArticleJob?.status === 'generating'}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${unfoldButtonClass}`}
                    >
                      {unfoldButtonLabel}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${copyButtonClass}`}
                    >
                      {copyStatus === 'copied'
                        ? t.copied
                        : copyStatus === 'failed'
                          ? t.copyFailed
                          : t.copy}
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
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

            {!loading && currentCards.length > 1 && (
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
          </>
        )}
      </div>
    )
  }

  function renderCompareView() {
    return renderStructuredPanel(
      t.compare,
      t.compareLead,
      t.difference,
      [t.comparePoint1, t.comparePoint2, t.comparePoint3],
      t.compareTakeaway
    )
  }

  function renderContextView() {
    return renderStructuredPanel(
      t.context,
      t.contextLead,
      t.contextPoint,
      [t.contextPoint1, t.contextPoint2, t.contextPoint3],
      t.contextTakeaway
    )
  }

  function renderLensView() {
    if (selectedLens === 'word') {
      if (wordLensLoading) {
        return (
          <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
          <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
                onClick={() => loadWordLens(true)}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )
      }

      return renderLiveLensCardView()
    }

    if (selectedLens === 'tension') {
      if (tensionLensLoading) {
        return (
          <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
          <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
                onClick={() => loadTensionLens(true)}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )
      }

      return renderLiveLensCardView()
    }

    if (selectedLens === 'phrase') {
      if (phraseLensLoading) {
        return (
          <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
          <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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
                onClick={() => loadPhraseLens(true)}
                className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
              >
                {t.tryAgain}
              </button>
            </div>
          </div>
        )
      }

      return renderLiveLensCardView()
    }

    return renderStructuredPanel(
      t.anotherLens,
      t.lensLeadDefault,
      t.lensPointLabel,
      [t.lensPoint1Default, t.lensPoint2Default, t.lensPoint3Default],
      t.lensTakeawayDefault
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-neutral-900">
      <div ref={articleTopRef} className="mx-auto flex w-full max-w-md flex-col">
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link
            href={`/bible/${book}/${chapter}`}
            className="text-neutral-500 transition hover:text-neutral-700"
          >
            {t.back}
          </Link>

          <Link href="/" className="text-neutral-500 transition hover:text-neutral-700">
            {t.home}
          </Link>
        </div>

        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-stone-900">
          {formattedReference || 'Loading...'}
        </h1>

        <div className="mb-5 flex gap-5 overflow-x-auto pb-1 text-[0.98rem] leading-6">
          <button
            type="button"
            onClick={handleShowOriginal}
            className={`whitespace-nowrap border-b bg-transparent pb-1 transition ${
              appLanguage === 'en'
                ? 'border-stone-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.english}
          </button>

          <button
            type="button"
            onClick={handleTranslateToSpanish}
            disabled={translationLoading}
            className={`whitespace-nowrap border-b bg-transparent pb-1 transition disabled:opacity-50 ${
              appLanguage === 'es'
                ? 'border-stone-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {translationLoading && appLanguage === 'es' ? t.translating : t.spanish}
          </button>

          <button
            type="button"
            disabled
            className="whitespace-nowrap border-b border-transparent bg-transparent pb-1 text-stone-300"
          >
            {t.french}
          </button>

          <button
            type="button"
            disabled
            className="whitespace-nowrap border-b border-transparent bg-transparent pb-1 text-stone-300"
          >
            {t.german}
          </button>

          <button
            type="button"
            onClick={handleTranslateToRussian}
            disabled={translationLoading}
            className={`whitespace-nowrap border-b bg-transparent pb-1 transition disabled:opacity-50 ${
              appLanguage === 'ru'
                ? 'border-stone-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {translationLoading && appLanguage === 'ru' ? t.translating : t.russian}
          </button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {renderTabButton(t.insights, activeTab === 'insights', () => {
            setActiveTab('insights')
            setLensSheetOpen(false)
          })}
          {renderTabButton(t.compare, activeTab === 'compare', () => {
            setActiveTab('compare')
            setLensSheetOpen(false)
            setActiveArticleKey('')
          })}
          {renderTabButton(t.context, activeTab === 'context', () => {
            setActiveTab('context')
            setLensSheetOpen(false)
            setActiveArticleKey('')
          })}
          {renderTabButton(t.anotherLens, activeTab === 'another-lens', () => {
            setLensSheetOpen(true)
            setActiveArticleKey('')
          })}
        </div>

        {activeTab === 'insights' && renderInsightsView()}
        {activeTab === 'compare' && renderCompareView()}
        {activeTab === 'context' && renderContextView()}
        {activeTab === 'another-lens' && renderLensView()}
      </div>

      {displayedCard && (
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

      {lensSheetOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 flex items-end bg-black/25 px-4 pb-4 pt-16">
          <div className="sheet-panel mx-auto w-full max-w-md rounded-[28px] border border-stone-300 bg-[#fbf6ea] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-stone-900">{t.lensTitle}</p>
                <p className="mt-1 text-sm text-stone-500">{t.chooseFocusedLens}</p>
                <p className="text-sm text-stone-500">{t.readThisVerseOneAngle}</p>
              </div>

              <button
                type="button"
                onClick={() => setLensSheetOpen(false)}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1.5 text-sm font-medium text-stone-700"
              >
                {t.close}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => handleSelectLens('word')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">{t.word}</p>
                <p className="mt-1 text-sm text-stone-500">{t.wordHelper}</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLens('tension')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">{t.tension}</p>
                <p className="mt-1 text-sm text-stone-500">{t.tensionHelper}</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLens('phrase')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">{t.phrase}</p>
                <p className="mt-1 text-sm text-stone-500">{t.phraseHelper}</p>
              </button>
            </div>
          </div>
        </div>
      )}

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
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scriptura-sheet-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tab-panel-enter {
          animation: scriptura-fade-slide-up 220ms ease;
        }

        .sheet-overlay {
          animation: scriptura-sheet-overlay 180ms ease;
        }

        .sheet-panel {
          animation: scriptura-sheet-up 220ms ease;
        }
      `}</style>
    </main>
  )
}
