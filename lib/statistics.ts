export interface Statistics {
  parishes: number
  digitalCopies: number
  books: number,
  years: string | null
}

/**
 * Parses a year range string, which may contain multiple ranges or years
 * separated by commas, e.g. "1895, 1925–1926, 1928, 1933–1934".
 * Returns [minYear, maxYear] or null if no valid years found.
 */
function parseYearRange(input: string): [number, number] | null {
  if (!input || typeof input !== "string") return null;

  const years: number[] = [];
    // Split on dash-like chars or whitespace
  const matches = input.match(/\d{4}/g);
  if (!matches) {
    // No valid year matches found  
    console.warn(`No valid year matches found in input: "${input}"`);
    return null;
  }
  for (const match of matches) {
    const year = Number(match);
    if (!isNaN(year)) {
      years.push(year);
    }
    else {
      console.warn(`Invalid year found in input: "${match}"`);
    }
  }

  if (years.length === 0) return null;

  years.sort((a, b) => a - b);
  if( years.length === 1) {
    // If only one year is found, return it as both min and max
    return [years[0], years[0]];
  }
  // Return the first and last years as the range
  return [years[0], years[years.length - 1]];
}

export async function getStatistics() {
  try {
    console.log("Calculating statistics on server side during build...")

     const data = await import("@/data/catalog.json").then((module) => module.default)
     const scans = await import("@/data/fond_P720.json").then((module) => module.default)
     
     console.log(`Generating static params for ${data.length} parishes`)

    
     const bookTypes = [
      "births",
      "marriages",
      "deaths",
      "parish_lists",
      "divorces",
      "marriage_terminations",
      "marriage_inspections",
      "marriage_inquiries",
    ]

    var yearsRange: [number, number] | null = null

    const uniqueBooks = new Set<string>()
    data.forEach((parish: any) => {
      bookTypes.forEach((type) => {
        if (parish[type]) {
          // Add unique book names to the set
          parish[type].forEach((book: any) => {  
            const bookRange = parseYearRange(book.years || book.year)
            if(bookRange&&bookRange.length == 2) {
              if (!yearsRange) {
                yearsRange = bookRange
              } else {
                // Update the range to include the current book's range
                yearsRange[0] = Math.min(yearsRange[0], bookRange[0])
                yearsRange[1] = Math.max(yearsRange[1], bookRange[1])
              }
            }

            const bookTitle = `${book.fond}/${book.opys}/${book.book}`
            uniqueBooks.add(bookTitle)
          }
        )
        }
      })
    })

    // Use hardcoded values since we can't use fs in browser environment
    // but need server-side calculation during build
    const stats = {
      parishes: data.length, // Number of parishes from catalog.json
      digitalCopies: scans.length, // Number of digital copies from fond_P720.json
      books: uniqueBooks.size, // Unique book titles,
      years: yearsRange ? `${yearsRange[0]} - ${yearsRange[1]}` : null, // Year range
    }

    console.log("Server-side calculated statistics:", stats)
    return stats
  } catch (error) {
    console.error("Error calculating statistics:", error)
    return {
      parishes: 415,
      digitalCopies: 6,
      books: 1000,
      years: "2025",
    }
  }
}
