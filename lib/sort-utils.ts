// Функція для сортування областей з особливим порядком
export function sortRegions(regions: any[]) {
  return regions.sort((a, b) => {
    // Рівненська область завжди перша
    if (a.name === "Рівненська область") return -1
    if (b.name === "Рівненська область") return 1

    // "Інші" завжди останні
    if (a.name === "Інші") return 1
    if (b.name === "Інші") return -1

    // Решта по алфавіту
    return a.name.localeCompare(b.name, "uk")
  })
}

// Функція для сортування по алфавіту
export function sortByName(items: any[]) {
  return items.sort((a, b) => a.name.localeCompare(b.name, "uk"))
}

// Функція для сортування парафій по назві
export function sortParishes(parishes: any[]) {
  return parishes.sort((a, b) => a.title.localeCompare(b.title, "uk"))
}

// Функція для збору всіх парафій з області "Інші"
export function getAllParishesFromOthers(region: any): any[] {
  const allParishes: any[] = []

  if (region.districts) {
    region.districts.forEach((district: any) => {
      if (district.hromadas) {
        district.hromadas.forEach((hromada: any) => {
          if (hromada.settlements) {
            hromada.settlements.forEach((settlement: any) => {
              if (settlement.parafii) {
                allParishes.push(...settlement.parafii)
              }
            })
          }
        })
      }
    })
  }

  return sortParishes(allParishes)
}
