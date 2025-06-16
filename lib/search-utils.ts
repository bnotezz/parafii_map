import Fuse from "fuse.js"

interface Parish {
  id: string
  parafiya: string
  religion: string
  settlements: string[]
  settlements_line: string
  church_settlement: string
  settlement?: string
  district?: string
  region?: string
  hromada?: string
}

interface SearchResult {
  parish: Parish
  score: number
  matchedField: "church_settlement" | "settlement" | "settlements"
  matchedValue: string
  startsWithQuery: boolean
}

// Налаштування для Fuse.js
const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 2,
  keys: [
    { name: "church_settlement", weight: 1.0 },
    { name: "settlement", weight: 0.8 },
    { name: "settlements", weight: 0.6 },
  ],
}

export function enhancedSearch(parishes: Parish[], query: string): SearchResult[] {
  if (!query || query.length < 3) return []

  const normalizedQuery = query.toLowerCase().trim()
  const results: SearchResult[] = []

  // Створюємо Fuse instance
  const fuse = new Fuse(parishes, fuseOptions)
  const fuseResults = fuse.search(normalizedQuery)

  // Обробляємо результати Fuse.js
  fuseResults.forEach((result) => {
    const parish = result.item
    const score = result.score || 1

    // Визначаємо, яке поле було знайдено та чи починається воно з запиту
    const matches = findMatches(parish, normalizedQuery)

    matches.forEach((match) => {
      results.push({
        parish,
        score: calculateFinalScore(score, match.field, match.startsWithQuery),
        matchedField: match.field,
        matchedValue: match.value,
        startsWithQuery: match.startsWithQuery,
      })
    })
  })

  // Видаляємо дублікати (якщо парафія знайдена по кількох полях)
  const uniqueResults = removeDuplicates(results)

  // Сортуємо результати
  return sortResults(uniqueResults)
}

function findMatches(
  parish: Parish,
  query: string,
): Array<{
  field: "church_settlement" | "settlement" | "settlements"
  value: string
  startsWithQuery: boolean
}> {
  const matches: Array<{
    field: "church_settlement" | "settlement" | "settlements"
    value: string
    startsWithQuery: boolean
  }> = []

  // Перевіряємо church_settlement
  if (parish.church_settlement?.toLowerCase().includes(query)) {
    matches.push({
      field: "church_settlement",
      value: parish.church_settlement,
      startsWithQuery: parish.church_settlement.toLowerCase().startsWith(query),
    })
  }

  // Перевіряємо settlement
  if (parish.settlement?.toLowerCase().includes(query)) {
    matches.push({
      field: "settlement",
      value: parish.settlement,
      startsWithQuery: parish.settlement.toLowerCase().startsWith(query),
    })
  }

  // Перевіряємо settlements array
  parish.settlements?.forEach((settlement) => {
    if (settlement.toLowerCase().includes(query)) {
      matches.push({
        field: "settlements",
        value: settlement,
        startsWithQuery: settlement.toLowerCase().startsWith(query),
      })
    }
  })

  return matches
}

function calculateFinalScore(
  fuseScore: number,
  field: "church_settlement" | "settlement" | "settlements",
  startsWithQuery: boolean,
): number {
  // Базовий вага для кожного поля (менше = краще)
  const fieldWeights = {
    church_settlement: 0.1,
    settlement: 0.2,
    settlements: 0.3,
  }

  // Бонус за початок з запиту
  const startsWithBonus = startsWithQuery ? 0.05 : 0

  // Фінальний скор (менше = краще)
  return fuseScore + fieldWeights[field] - startsWithBonus
}

function removeDuplicates(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter((result) => {
    if (seen.has(result.parish.id)) {
      return false
    }
    seen.add(result.parish.id)
    return true
  })
}

function sortResults(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    // Спочатку сортуємо за скором (менше = краще)
    if (a.score !== b.score) {
      return a.score - b.score
    }

    // Потім за алфавітом назви парафії
    return a.parish.parafiya.localeCompare(b.parish.parafiya, "uk")
  })
}
