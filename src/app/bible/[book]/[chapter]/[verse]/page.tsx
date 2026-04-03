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
  insights?: InsightItem[]
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

type AppLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de'
type ArticleJobStatus = 'idle' | 'generating' | 'ready' | 'failed'
type TopTab = 'insights' | 'compare' | 'context' | 'lens'
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
    lens: string

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

    lensLeadDefault: string
    lensTakeawayDefault: string

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

    loadingCompare: string
    loadingCompareText: string
    compareUnavailable: string

    backToTop: string
    copiedAnalysis: string
    copyAnalysis: string
    shareAnalysis: string

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
    lens: 'Lens',

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

    lensTitle: 'Lens',
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

    lensLeadDefault: 'Choose a focused lens to read this verse through one angle.',
    lensTakeawayDefault: 'Lens is the focused-reading family, not just a reroll button.',

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

    loadingCompare: 'Loading Compare mode',
    loadingCompareText:
      'Comparing translation pressure, wording choices, and shifts in emphasis…',
    compareUnavailable: 'Unable to load Compare mode.',

    backToTop: 'Back to top',
    copiedAnalysis: 'Analysis copied',
    copyAnalysis: 'Copy analysis',
    shareAnalysis: 'Share analysis',

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
    lens: 'Линза',

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

    lensTitle: 'Линза',
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

    lensLeadDefault:
      'Выберите сфокусированную линзу, чтобы посмотреть на этот стих под одним углом.',
    lensTakeawayDefault: '«Линза» — это семейство сфокусированного чтения, а не просто кнопка reroll.',

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

    loadingCompare: 'Загрузка режима «Сравнение»',
    loadingCompareText:
      'Сравниваем переводческое давление, выбор формулировок и сдвиги акцента…',
    compareUnavailable: 'Не удалось загрузить режим «Сравнение».',

    backToTop: 'Наверх',
    copiedAnalysis: 'Анализ скопирован',
    copyAnalysis: 'Копировать анализ',
    shareAnalysis: 'Поделиться анализом',

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
    lens: 'Lente',

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

    lensTitle: 'Lente',
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

    lensLeadDefault:
      'Elige una lente enfocada para leer este versículo desde un solo ángulo.',
    lensTakeawayDefault: 'Lente es la familia de lectura enfocada, no solo un botón de repetir.',

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

    loadingCompare: 'Cargando modo Comparar',
    loadingCompareText:
      'Comparando presión de traducción, elecciones de redacción y cambios de énfasis…',
    compareUnavailable: 'No se pudo cargar el modo Comparar.',

    backToTop: 'Volver arriba',
    copiedAnalysis: 'Análisis copiado',
    copyAnalysis: 'Copiar análisis',
    shareAnalysis: 'Compartir análisis',

    tryAgain: 'Intentar de nuevo',
    lensLabel: 'Lente',
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

    insights: 'Insights',
    compare: 'Comparer',
    context: 'Contexte',
    lens: 'Lentille',

    loadingInsight: 'Chargement de l’insight',
    loadingInsightText: 'Veuillez patienter pendant la génération des cartes.',
    unableToLoad: 'Impossible de charger',
    rawModelOutput: 'Sortie brute du modèle',
    noInsight: 'Aucun insight',
    noInsightText: 'Aucun insight n’est disponible pour ce verset.',

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

    compareLead:
      'Ce mode comparera les choix de traduction et montrera comment la formulation déplace l’attention du lecteur.',
    compareTakeaway:
      'Comparer doit ressembler à un outil de lecture, pas à une simple liste brute.',
    compareDiffLabel: 'Différence',

    contextLead:
      'Ce mode ne montrera que le contexte qui change réellement la lecture du verset.',
    contextTakeaway:
      'Le contexte doit expliquer pourquoi le verset sonne ainsi dans son cadre réel.',
    contextPointLabel: 'Point de contexte',

    lensTitle: 'Lentille',
    chooseFocusedLens: 'Choisissez une lentille ciblée',
    readThisVerseOneAngle: 'Lisez ce verset sous un angle précis.',
    close: 'Fermer',
    change: 'Changer',

    word: 'Mot',
    tension: 'Tension',
    phrase: 'Pourquoi cette phrase',

    wordHelper: 'Poids caché des mots',
    tensionHelper: 'Ce qui surprend ici',
    phraseHelper: 'Pourquoi c’est dit ainsi',

    lensPointLabel: 'Point de lentille',
    takeaway: 'Conclusion',

    lensLeadDefault: 'Choisissez une lentille ciblée pour lire ce verset sous un angle précis.',
    lensTakeawayDefault: 'La lentille est une famille de lecture ciblée, pas juste un reroll.',

    comparePoint1: 'Un court lead nommera la tension principale de traduction.',
    comparePoint2:
      'La version finale montrera 3–5 points compacts au lieu d’un bloc dense.',
    comparePoint3:
      'Une courte conclusion expliquera pourquoi ces différences comptent.',

    contextPoint1:
      'La version finale identifiera le type de contexte le plus important ici.',
    contextPoint2:
      'Elle montrera 3–5 points de contexte compacts, pas un panneau encyclopédique lourd.',
    contextPoint3:
      'Une conclusion finale expliquera comment le contexte change la force du verset.',

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

    loadingCompare: 'Chargement du mode Comparer',
    loadingCompareText:
      'Comparaison de la pression de traduction, des choix de formulation et des déplacements d’accent…',
    compareUnavailable: 'Impossible de charger le mode Comparer.',

    backToTop: 'Haut de page',
    copiedAnalysis: 'Analyse copiée',
    copyAnalysis: 'Copier l’analyse',
    shareAnalysis: 'Partager l’analyse',

    tryAgain: 'Réessayer',
    lensLabel: 'Lentille',
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

    insights: 'Insights',
    compare: 'Vergleich',
    context: 'Kontext',
    lens: 'Linse',

    loadingInsight: 'Insight wird geladen',
    loadingInsightText: 'Bitte warten, während die Karten erzeugt werden.',
    unableToLoad: 'Konnte nicht geladen werden',
    rawModelOutput: 'Rohausgabe des Modells',
    noInsight: 'Kein Insight',
    noInsightText: 'Für diesen Vers ist noch kein Insight verfügbar.',

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

    compareLead:
      'Dieser Modus vergleicht Übersetzungsentscheidungen und zeigt, wie Formulierungen die Aufmerksamkeit verschieben.',
    compareTakeaway:
      'Vergleich sollte sich wie ein Lesewerkzeug anfühlen, nicht wie eine rohe Liste.',
    compareDiffLabel: 'Unterschied',

    contextLead:
      'Dieser Modus zeigt nur den Kontext, der die Lesart des Verses wirklich verändert.',
    contextTakeaway:
      'Der Kontext soll erklären, warum der Vers in seinem echten Rahmen so klingt.',
    contextPointLabel: 'Kontextpunkt',

    lensTitle: 'Linse',
    chooseFocusedLens: 'Wähle eine fokussierte Linse',
    readThisVerseOneAngle: 'Lies diesen Vers aus einem bestimmten Blickwinkel.',
    close: 'Schließen',
    change: 'Ändern',

    word: 'Wort',
    tension: 'Spannung',
    phrase: 'Warum diese Formulierung',

    wordHelper: 'Verstecktes Gewicht der Wörter',
    tensionHelper: 'Was hier überrascht',
    phraseHelper: 'Warum es so gesagt wird',

    lensPointLabel: 'Linsenpunkt',
    takeaway: 'Fazit',

    lensLeadDefault: 'Wähle eine fokussierte Linse, um diesen Vers aus einem Blickwinkel zu lesen.',
    lensTakeawayDefault: 'Die Linse ist eine fokussierte Lesefamilie, nicht nur ein Reroll.',

    comparePoint1:
      'Ein kurzer Lead benennt die wichtigste Übersetzungsspannung im Vers.',
    comparePoint2:
      'Die endgültige Version zeigt 3–5 kompakte Vergleichspunkte statt eines dichten Blocks.',
    comparePoint3:
      'Ein kurzes Fazit erklärt, warum diese Unterschiede für die Lesart wichtig sind.',

    contextPoint1:
      'Die endgültige Version identifiziert den wichtigsten Kontexttyp an dieser Stelle.',
    contextPoint2:
      'Sie zeigt 3–5 kompakte Kontextpunkte statt eines schweren enzyklopädischen Panels.',
    contextPoint3:
      'Ein abschließendes Fazit erklärt, wie der Kontext die Wirkung des Verses verändert.',

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

    loadingCompare: 'Vergleichsmodus wird geladen',
    loadingCompareText:
      'Übersetzungsdruck, Formulierungswahl und Akzentverschiebungen werden verglichen…',
    compareUnavailable: 'Vergleichsmodus konnte nicht geladen werden.',

    backToTop: 'Nach oben',
    copiedAnalysis: 'Analyse kopiert',
    copyAnalysis: 'Analyse kopieren',
    shareAnalysis: 'Analyse teilen',

    tryAgain: 'Erneut versuchen',
    lensLabel: 'Linse',
  },
}

function emptyLensMap(): Record<AppLanguage, InsightItem[]> {
  return {
    en: [],
    ru: [],
    es: [],
    fr: [],
    de: [],
  }
}

function emptyCompareMap(): Record<AppLanguage, ComparePayload | null> {
  return {
    en: null,
    ru: null,
    es: null,
    fr: null,
    de: null,
  }
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [verseText, setVerseText] = useState('')
  const [translatedVerseTexts, setTranslatedVerseTexts] = useState<Record<string, string>>({})

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [wordLensCardsByLanguage, setWordLensCardsByLanguage] = useState<Record<AppLanguage, InsightItem[]>>(emptyLensMap())
  const [tensionLensCardsByLanguage, setTensionLensCardsByLanguage] = useState<Record<AppLanguage, InsightItem[]>>(emptyLensMap())
  const [phraseLensCardsByLanguage, setPhraseLensCardsByLanguage] = useState<Record<AppLanguage, InsightItem[]>>(emptyLensMap())
  const [compareByLanguage, setCompareByLanguage] = useState<Record<AppLanguage, ComparePayload | null>>(emptyCompareMap())
  const [currentIndex, setCurrentIndex] = useState(0)

  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState('')
  const [compareCopyStatus, setCompareCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [compareShareStatus, setCompareShareStatus] = useState('')

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
      setWordLensCardsByLanguage(emptyLensMap())
      setTensionLensCardsByLanguage(emptyLensMap())
      setPhraseLensCardsByLanguage(emptyLensMap())
      setCompareByLanguage(emptyCompareMap())
      setCompareError('')
      setCompareCopyStatus('idle')
      setCompareShareStatus('')
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
      setAppLanguage('en')

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

  const formattedReference = useMemo(() => {
    if (!book || !chapter || !verse) return ''
    return `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}`
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
    if (activeTab === 'lens') {
      return `lens:${selectedLens ?? 'none'}`
    }
    return activeTab
  }, [activeTab, selectedLens])

  const currentCardKey = useMemo(() => {
    if (!currentInsight) return ''
    return `${currentModeKey}:${appLanguage}:${currentIndex}:${currentInsight.title}:${currentInsight.text}`
  }, [currentModeKey, appLanguage, currentIndex, currentInsight])

  const compareData = useMemo(() => compareByLanguage[appLanguage], [compareByLanguage, appLanguage])

  async function translateCard(targetLanguage: 'ru' | 'es' | 'fr' | 'de', card: InsightItem, cardKey: string) {
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

  async function translateVerseText(targetLanguage: 'ru' | 'es' | 'fr' | 'de', text: string, key: string) {
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

  async function loadWordLens(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText) return
    if (!force && wordLensCardsByLanguage[language]?.length > 0) return

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

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setWordLensError(data.error || t.wordLensUnavailable)
        setWordLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
        return
      }

      setWordLensCardsByLanguage((prev) => ({ ...prev, [language]: data.cards as InsightItem[] }))
    } catch {
      setWordLensError(t.wordLensUnavailable)
      setWordLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
    } finally {
      setWordLensLoading(false)
    }
  }

  async function loadTensionLens(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText) return
    if (!force && tensionLensCardsByLanguage[language]?.length > 0) return

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

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setTensionLensError(data.error || t.tensionLensUnavailable)
        setTensionLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
        return
      }

      setTensionLensCardsByLanguage((prev) => ({ ...prev, [language]: data.cards as InsightItem[] }))
    } catch {
      setTensionLensError(t.tensionLensUnavailable)
      setTensionLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
    } finally {
      setTensionLensLoading(false)
    }
  }

  async function loadPhraseLens(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText) return
    if (!force && phraseLensCardsByLanguage[language]?.length > 0) return

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

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setPhraseLensError(data.error || t.phraseLensUnavailable)
        setPhraseLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
        return
      }

      setPhraseLensCardsByLanguage((prev) => ({ ...prev, [language]: data.cards as InsightItem[] }))
    } catch {
      setPhraseLensError(t.phraseLensUnavailable)
      setPhraseLensCardsByLanguage((prev) => ({ ...prev, [language]: [] }))
    } finally {
      setPhraseLensLoading(false)
    }
  }

  async function loadCompare(force = false, language: AppLanguage = appLanguage) {
    if (!formattedReference || !verseText) return
    if (!force && compareByLanguage[language]) return

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

      if (!res.ok || !data.compare || !Array.isArray(data.compare.points)) {
        setCompareError(data.error || t.compareUnavailable)
        setCompareByLanguage((prev) => ({ ...prev, [language]: null }))
        return
      }

      setCompareByLanguage((prev) => ({ ...prev, [language]: data.compare as ComparePayload }))
    } catch {
      setCompareError(t.compareUnavailable)
      setCompareByLanguage((prev) => ({ ...prev, [language]: null }))
    } finally {
      setCompareLoading(false)
    }
  }

  useEffect(() => {
    if (!formattedReference || !verseText) return

    if (activeTab === 'compare') {
      void loadCompare(false, appLanguage)
    }

    if (activeTab === 'lens' && selectedLens === 'word') {
      void loadWordLens(false, appLanguage)
    }

    if (activeTab === 'lens' && selectedLens === 'tension') {
      void loadTensionLens(false, appLanguage)
    }

    if (activeTab === 'lens' && selectedLens === 'phrase') {
      void loadPhraseLens(false, appLanguage)
    }
  }, [activeTab, selectedLens, appLanguage, formattedReference, verseText])

  async function handleSetLanguage(targetLanguage: AppLanguage) {
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setCompareCopyStatus('idle')
    setCompareShareStatus('')

    if (targetLanguage === 'en') {
      setAppLanguage('en')
      return
    }

    if (activeTab === 'insights') {
      if (!currentInsight || !currentCardKey) {
        setAppLanguage(targetLanguage)
        return
      }

      setTranslationLoading(true)

      try {
        await Promise.all([
          translateCard(targetLanguage, currentInsight, `${currentModeKey}:${currentIndex}:${currentInsight.title}:${currentInsight.text}`),
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
    if (currentCards.length === 0) return
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
    if (currentCards.length === 0) return
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

    if (Math.abs(deltaX) < threshold) return

    if (deltaX < 0) {
      await handleNext()
    } else {
      await handlePrev()
    }
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

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }

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

  async function handleSelectLens(lens: LensKind) {
    setSelectedLens(lens)
    setLensSheetOpen(false)
    setActiveTab('lens')
    setActiveArticleKey('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setCurrentIndex(0)

    if (lens === 'word') await loadWordLens(false, appLanguage)
    if (lens === 'tension') await loadTensionLens(false, appLanguage)
    if (lens === 'phrase') await loadPhraseLens(false, appLanguage)
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
    takeaway: string
  ) {
    return (
      <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
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

  function renderCompareView() {
    if (compareLoading) {
      return (
        <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.loadingCompare}
            </p>
            <p className="text-[1.08rem] leading-9 text-stone-800">{t.loadingCompareText}</p>
          </div>
        </div>
      )
    }

    if (compareError) {
      return (
        <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {t.compare}
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
        t.compare,
        t.compareLead,
        t.compareDiffLabel,
        [t.comparePoint1, t.comparePoint2, t.comparePoint3],
        t.compareTakeaway
      )
    }

    return (
      <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {t.compare}
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

  function renderContextView() {
    return renderStructuredPanel(
      t.context,
      t.contextLead,
      t.contextPointLabel,
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
                onClick={() => loadWordLens(true, appLanguage)}
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
                onClick={() => loadTensionLens(true, appLanguage)}
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
                onClick={() => loadPhraseLens(true, appLanguage)}
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
      t.lens,
      t.lensLeadDefault,
      t.lensPointLabel,
      ['Word', 'Tension', 'Why This Phrase'],
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
                disabled={translationLoading && activeTab === 'insights'}
                className={`whitespace-nowrap border-b bg-transparent pb-1 transition disabled:opacity-50 ${
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
          {renderTabButton(t.lens, activeTab === 'lens', () => {
            setLensSheetOpen(true)
            setActiveArticleKey('')
          })}
        </div>

        {activeTab === 'insights' && renderInsightsView()}
        {activeTab === 'compare' && renderCompareView()}
        {activeTab === 'context' && renderContextView()}
        {activeTab === 'lens' && renderLensView()}
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
                onClick={() => void handleSelectLens('word')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">{t.word}</p>
                <p className="mt-1 text-sm text-stone-500">{t.wordHelper}</p>
              </button>

              <button
                type="button"
                onClick={() => void handleSelectLens('tension')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">{t.tension}</p>
                <p className="mt-1 text-sm text-stone-500">{t.tensionHelper}</p>
              </button>

              <button
                type="button"
                onClick={() => void handleSelectLens('phrase')}
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
