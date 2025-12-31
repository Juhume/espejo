// Spanish stopwords to filter out common words
const SPANISH_STOPWORDS = new Set([
  "a",
  "al",
  "algo",
  "algunas",
  "algunos",
  "ante",
  "antes",
  "como",
  "con",
  "contra",
  "cual",
  "cuando",
  "de",
  "del",
  "desde",
  "donde",
  "durante",
  "e",
  "el",
  "ella",
  "ellas",
  "ellos",
  "en",
  "entre",
  "era",
  "esa",
  "esas",
  "ese",
  "eso",
  "esos",
  "esta",
  "estado",
  "estas",
  "este",
  "esto",
  "estos",
  "fue",
  "fueron",
  "ha",
  "han",
  "hasta",
  "hay",
  "he",
  "hemos",
  "hoy",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "luego",
  "más",
  "me",
  "mi",
  "mis",
  "muy",
  "nada",
  "ni",
  "no",
  "nos",
  "nosotros",
  "nuestra",
  "nuestras",
  "nuestro",
  "nuestros",
  "o",
  "os",
  "otra",
  "otras",
  "otro",
  "otros",
  "para",
  "pero",
  "poco",
  "por",
  "porque",
  "que",
  "quien",
  "quienes",
  "qué",
  "se",
  "sea",
  "sean",
  "ser",
  "si",
  "sido",
  "siendo",
  "sin",
  "sobre",
  "soy",
  "su",
  "sus",
  "también",
  "tan",
  "te",
  "tengo",
  "ti",
  "tiene",
  "tienen",
  "todo",
  "todos",
  "tu",
  "tus",
  "un",
  "una",
  "unas",
  "uno",
  "unos",
  "va",
  "vamos",
  "voy",
  "y",
  "ya",
  "yo",
  "él",
  "ésta",
  "éstas",
  "éste",
  "éstos",
])

// Common filler words in Spanish (muletillas)
export const DEFAULT_FILLERS = [
  "en plan",
  "o sea",
  "literal",
  "literalmente",
  "tipo",
  "como que",
  "básicamente",
  "osea",
  "pues",
  "entonces",
  "bueno",
  "vale",
  "sabes",
  "entiendes",
  "digamos",
  "es que",
  "la verdad",
  "sinceramente",
  "honestamente",
  "realmente",
  "obviamente",
]

// Signal words that might indicate emotional state
export const DEFAULT_SIGNAL_WORDS = [
  "cansado",
  "cansada",
  "agotado",
  "agotada",
  "ansiedad",
  "ansioso",
  "ansiosa",
  "estresado",
  "estresada",
  "debería",
  "tendría",
  "podría",
  "miedo",
  "preocupado",
  "preocupada",
  "triste",
  "feliz",
  "contento",
  "contenta",
  "orgulloso",
  "orgullosa",
  "frustrado",
  "frustrada",
  "enfadado",
  "enfadada",
  "tranquilo",
  "tranquila",
  "motivado",
  "motivada",
  "perdido",
  "perdida",
  "confundido",
  "confundida",
]

export interface TextAnalysis {
  wordCount: number
  uniqueWords: number
  avgWordLength: number
  avgSentenceLength: number
  topWords: Array<{ word: string; count: number }>
  fillerCounts: Array<{ filler: string; count: number }>
  signalWordCounts: Array<{ word: string; count: number }>
  sentenceCount: number
}

export interface PeriodAnalysis {
  totalWords: number
  totalEntries: number
  avgWordsPerEntry: number
  topWords: Array<{ word: string; count: number }>
  fillerTotals: Array<{ filler: string; count: number }>
  signalWordTotals: Array<{ word: string; count: number }>
  wordTrend: Array<{ date: string; count: number }>
}

// Normalize text for analysis
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents for matching
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ")
    .trim()
}

// Tokenize text into words
function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  return normalized.split(" ").filter((word) => word.length > 1)
}

// Count word frequencies, excluding stopwords
function countWords(words: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const word of words) {
    if (!SPANISH_STOPWORDS.has(word) && word.length > 2) {
      counts.set(word, (counts.get(word) || 0) + 1)
    }
  }
  return counts
}

// Count filler words (can be multi-word phrases)
function countFillers(text: string, fillers: string[]): Map<string, number> {
  const normalized = text.toLowerCase()
  const counts = new Map<string, number>()

  for (const filler of fillers) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi")
    const matches = normalized.match(regex)
    if (matches && matches.length > 0) {
      counts.set(filler, matches.length)
    }
  }

  return counts
}

// Count signal words
function countSignalWords(words: string[], signalWords: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  const normalizedSignals = signalWords.map((w) => normalizeText(w))

  for (const word of words) {
    if (normalizedSignals.includes(word)) {
      // Find the original signal word for display
      const originalIndex = normalizedSignals.indexOf(word)
      const original = signalWords[originalIndex]
      counts.set(original, (counts.get(original) || 0) + 1)
    }
  }

  return counts
}

// Count sentences
function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  return Math.max(sentences.length, 1)
}

// Analyze a single text
export function analyzeText(
  text: string,
  fillers: string[] = DEFAULT_FILLERS,
  signalWords: string[] = DEFAULT_SIGNAL_WORDS,
): TextAnalysis {
  const words = tokenize(text)
  const wordCounts = countWords(words)
  const fillerCounts = countFillers(text, fillers)
  const signalWordCounts = countSignalWords(words, signalWords)
  const sentenceCount = countSentences(text)

  // Get top words sorted by frequency
  const topWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))

  // Format filler counts
  const fillerResults = Array.from(fillerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([filler, count]) => ({ filler, count }))

  // Format signal word counts
  const signalResults = Array.from(signalWordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))

  return {
    wordCount: words.length,
    uniqueWords: wordCounts.size,
    avgWordLength: words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0,
    avgSentenceLength: words.length / sentenceCount,
    topWords,
    fillerCounts: fillerResults,
    signalWordCounts: signalResults,
    sentenceCount,
  }
}

// Analyze multiple entries for a period
export function analyzePeriod(
  entries: Array<{ date: string; content: string }>,
  fillers: string[] = DEFAULT_FILLERS,
  signalWords: string[] = DEFAULT_SIGNAL_WORDS,
): PeriodAnalysis {
  const allWords: string[] = []
  const allWordCounts = new Map<string, number>()
  const allFillerCounts = new Map<string, number>()
  const allSignalCounts = new Map<string, number>()
  const wordTrend: Array<{ date: string; count: number }> = []

  for (const entry of entries) {
    const analysis = analyzeText(entry.content, fillers, signalWords)

    // Aggregate words
    const words = tokenize(entry.content)
    allWords.push(...words)

    // Aggregate word counts
    const wordCounts = countWords(words)
    wordCounts.forEach((count, word) => {
      allWordCounts.set(word, (allWordCounts.get(word) || 0) + count)
    })

    // Aggregate filler counts
    analysis.fillerCounts.forEach(({ filler, count }) => {
      allFillerCounts.set(filler, (allFillerCounts.get(filler) || 0) + count)
    })

    // Aggregate signal word counts
    analysis.signalWordCounts.forEach(({ word, count }) => {
      allSignalCounts.set(word, (allSignalCounts.get(word) || 0) + count)
    })

    // Track word count by date
    wordTrend.push({ date: entry.date, count: analysis.wordCount })
  }

  // Get top words
  const topWords = Array.from(allWordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }))

  // Get filler totals
  const fillerTotals = Array.from(allFillerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([filler, count]) => ({ filler, count }))

  // Get signal word totals
  const signalWordTotals = Array.from(allSignalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }))

  return {
    totalWords: allWords.length,
    totalEntries: entries.length,
    avgWordsPerEntry: entries.length > 0 ? allWords.length / entries.length : 0,
    topWords,
    fillerTotals,
    signalWordTotals,
    wordTrend: wordTrend.sort((a, b) => a.date.localeCompare(b.date)),
  }
}
