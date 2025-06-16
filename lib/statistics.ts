export interface Statistics {
  parishes: number
  digitalCopies: number
  books: number
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

    const uniqueBooks = new Set<string>()
    data.forEach((parish: any) => {
      bookTypes.forEach((type) => {
        if (parish[type]) {
          // Add unique book names to the set
          parish[type].forEach((book: any) => {  
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
      books: uniqueBooks.size, // Unique book titles
    }

    console.log("Server-side calculated statistics:", stats)
    return stats
  } catch (error) {
    console.error("Error calculating statistics:", error)
    return {
      parishes: 415,
      digitalCopies: 6,
      books: 1000,
    }
  }
}
