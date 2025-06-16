import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/env"
import { sharedMetadata } from '@/shared/metadata'
import {
  MapPin,
  Calendar,
  Book,
  Eye,
  SearchIcon,
  Church,
  Baby,
  Heart,
  Skull,
  Users,
  FileSearch,
  FileX,
} from "lucide-react"
import Link from "next/link"
import { getReligionColor, getReligionLabel, getReligionIcon } from "@/lib/religion-utils"
import { AdditionalResources } from "@/components/additional-resources"
import { HierarchyBreadcrumbs } from "@/components/hierarchy-breadcrumbs"
import { notFound } from "next/navigation"

interface Parish {
  id: string
  parafiya: string
  religion: string
  settlements: string
  church_settlement: string
  hromada_name?: string
  district_name?: string
  region_name?: string
  modern_settlement_name?: string
  books?: {
    births: BookRecord[]
    marriages: BookRecord[]
    deaths: BookRecord[]
    parish_lists: BookRecord[]
    divorces: BookRecord[]
    marriage_inspections: BookRecord[]
  }
  [key: string]: any // For dynamic access to book types
}

interface BookRecord {
  fond: string
  opys: string
  book: string
  years: string
  url?: string
  title?: string
}

// Generate static params for all parishes
export async function generateStaticParams() {
  try {
    const data = await import("@/data/catalog.json").then((module) => module.default)

    console.log(`Generating static params for ${data.length} parishes`)

    const params = data
      .map((parish: any) => {
        if (!parish.id) {
          console.warn("Parish without ID found:", parish)
          return null
        }
        return {
          id: String(parish.id),
        }
      })
      .filter(Boolean)

    //console.log(`Generated ${params.length} parish params`)
    return params
  } catch (error) {
    console.error("Error generating static params for parishes:", error)
    return []
  }
}

function searchBookRecords(books: BookRecord[], booksData: any) {
  if (books && booksData && books.length > 0) {
    books
      .filter((book: BookRecord) => book.fond === "Р–740")
      .forEach((book: BookRecord) => {
        const book7P20 = booksData.find((b: any) => b.opys === book.opys && b.sprava === book.book)
        if (book7P20) {
          book.url = book7P20.url
          book.title = book7P20.name
        }
      })
  }
}

async function getParishData(parishId: String): Promise<Parish | null> {
    //console.log("Loading parish with ID:", params.id)
    // Завантажити основні дані парафії
    const catalogData = await import("@/data/catalog.json").then((module) => module.default)
    //console.log(`Loaded catalog with ${catalogData.length} parishes`)

    // Try to find parish by exact ID match first
    let foundParish = catalogData.find((p: Parish) => String(p.id) === String(parishId))
    if( !foundParish) {
      return null
    }

    //console.log("Found parish:", foundParish.parafiya)

    const parish: Parish = { ...foundParish }

    // Завантажити дані про сучасний населений пункт
    const treeData = await import("@/data/parafii_tree.json").then((module) => module.default)

    // Знайти повну інформацію про парафію в дереві
    outer: for (const region of treeData) {
      if (!region.name.includes("Інші")) {
        for (const district of region.districts) {
          for (const hromada of district.hromadas) {
            for (const settlement of hromada.settlements) {
              for (const parishItem of settlement.parafii) {
                if (String(parishItem.id) === String(parish.id)) {
                  parish.hromada_name = hromada.name
                  parish.district_name = district.name
                  parish.region_name = region.name
                  parish.modern_settlement_name = [region.name, district.name, hromada.name, settlement.name]
                    .filter(Boolean)
                    .join(" ")

                  break outer
                }
              }
            }
          }
        }
      }
    }

    return parish
}
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata>{
  const { id } = await params

  const parish = await getParishData(id)
  if (!parish) {
    return {
      title: "Парафію не знайдено",
      description: "Інформація про парафію відсутня",
    }
  }

    const title = `${parish.parafiya}`
    const description = `Метричні книги парафії ${parish.parafiya}. ${parish.region_name}, ${parish.district_name}, ${parish.hromada_name}, ${parish.modern_settlement_name}`
  
    return {
      title,
      description,
      openGraph: {
        ...sharedMetadata.openGraph,
        title:title,
        description:description,
        url: `${siteConfig.url}/parafia/${parish.id}`,
      },
      twitter: {
        ...sharedMetadata.twitter,
        title:title,
        description:description,
      },
    }
}

export default async function ParishPage({ params }: { params: { id: string } }) {
  try {
    //console.log("Loading parish with ID:", params.id)
    // Завантажити дані про парафію
    const { id } = await params
    const parish = await getParishData(id)  

    if (!parish) {
        return notFound()
    }
    // Ініціалізувати структуру для книг
    parish.books = {
      births: [],
      marriages: [],
      deaths: [],
      parish_lists: [],
      divorces: [],
      marriage_inspections: [],
    }

    // Перенести дані з полів парафії у структуру книг
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

    bookTypes.forEach((type) => {
      if (parish[type]) {
        const targetType =
          type === "marriage_terminations" ? "divorces" : type === "marriage_inquiries" ? "marriage_inspections" : type

        parish.books[targetType].push(...parish[type])
        delete parish[type]
      }
    })

    // Завантажити дані про метричні книги
    try {
      const booksData = await import("@/data/fond_P720.json").then((module) => module.default)

      // Додати URL та заголовки для метричних книг
      Object.values(parish.books).forEach((bookArray) => {
        searchBookRecords(bookArray, booksData)
      })
    } catch (error) {
      console.error("Error loading books data:", error)
    }

    const bookCategories = [
      {
        key: "births",
        name: "Народження",
        color: "text-green-700",
        icon: Baby,
        books: parish.books.births,
      },
      {
        key: "marriages",
        name: "Шлюби",
        color: "text-blue-700",
        icon: Heart,
        books: parish.books.marriages,
      },
      {
        key: "deaths",
        name: "Смерті",
        color: "text-red-700",
        icon: Skull,
        books: parish.books.deaths,
      },
      {
        key: "parish_lists",
        name: "Списки парафіян",
        color: "text-green-700",
        icon: Users,
        books: parish.books.parish_lists,
      },
      {
        key: "marriage_inspections",
        name: "Шлюбні обшуки",
        color: "text-blue-700",
        icon: FileSearch,
        books: parish.books.marriage_inspections,
      },
      {
        key: "divorces",
        name: "Припинення шлюбу",
        color: "text-red-700",
        icon: FileX,
        books: parish.books.divorces,
      },
    ].filter((category) => category.books?.length > 0)

    // Створюємо елементи для breadcrumbs
    const breadcrumbItems = []

    if (parish.region_name && !parish.region_name.includes("Інші")) {
      breadcrumbItems.push({
        label: parish.region_name,
        href: `/hierarchy/${encodeURIComponent(parish.region_name)}`,
      })

      if (parish.district_name) {
        breadcrumbItems.push({
          label: parish.district_name,
          href: `/hierarchy/${encodeURIComponent(parish.region_name)}/${encodeURIComponent(parish.district_name)}`,
        })

        if (parish.hromada_name) {
          breadcrumbItems.push({
            label: parish.hromada_name,
            href: `/hierarchy/${encodeURIComponent(parish.region_name)}/${encodeURIComponent(parish.district_name)}/${encodeURIComponent(parish.hromada_name)}`,
          })
        }
      }
    }

    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            {/* Breadcrumbs */}
            {parish.region_name && !parish.region_name.includes("Інші") ? (
              <HierarchyBreadcrumbs items={breadcrumbItems} />
            ) : (
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link href="/" className="hover:text-primary">
                  Головна
                </Link>
                <span>/</span>
                <Link href="/hierarchy" className="hover:text-primary">
                  Список парафій
                </Link>
              </nav>
            )}

            {/* Parish Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {parish.parafiya}
              </h1>

              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 bg-gray-50 rounded-lg border flex items-center justify-center">
                  <i
                    className={`fas fa-${getReligionIcon(parish.religion)} text-sm`}
                    style={{ color: getReligionColor(parish.religion) }}
                  ></i>
                </div>
                <span className="text-lg font-medium">{getReligionLabel(parish.religion)}</span>
              </div>

              {/* Map Button */}
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 mt-4"
              >
                <Link href={`/?focus=${parish.id}`} className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Показати на карті
                </Link>
              </Button>
            </div>

            {/* Parish Information */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Територіальна інформація
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold mb-1 flex items-center gap-2">
                        <Church className="h-4 w-4" /> Центр парафії
                      </h4>
                      <p>{parish.church_settlement}</p>
                    </div>

                    {parish.modern_settlement_name && (
                      <div>
                        <h4 className="font-semibold mb-1">Сучасний населений пункт</h4>
                        <p>{parish.modern_settlement_name}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">Населені пункти парафії</h4>
                    <p className="text-muted-foreground">{parish.settlements}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metric Books */}
            {bookCategories.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5" />
                    Наявні метричні книги
                  </CardTitle>
                  <CardDescription>Роки, за які збереглися метричні записи</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {bookCategories.map((category) => {
                      const IconComponent = category.icon
                      return (
                        <div key={category.key} className="space-y-3">
                          <h4 className={`font-semibold text-lg ${category.color} flex items-center gap-2`}>
                            <IconComponent className="h-5 w-5" />
                            {category.name}
                            <Badge variant="outline" className="ml-2">
                              {category.books.length}
                            </Badge>
                          </h4>
                          <div className="space-y-2">
                            {category.books.map((book, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border"
                              >
                                <div
                                  className="flex flex-col flex-1 min-w-0"
                                  title={book.title || `${book.fond} ${book.opys} ${book.book}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="font-medium">{book.years}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Фонд {book.fond}, опис {book.opys}, справа {book.book}
                                  </div>
                                </div>
                                <div className="flex gap-1 ml-2 flex-shrink-0">
                                  {book.url ? (
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                                      <a
                                        href={book.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Переглянути книгу"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                                      <a
                                        href={`https://inspector.duckarchive.com/archives/%D0%94%D0%90%D0%A0%D0%9E/${book.fond.replace("–", "")}/${book.opys}/${book.book}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Пошук справи на Качиному Інспекторі"
                                      >
                                        <SearchIcon className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* External Resources */}
            <AdditionalResources searchTerm={parish.church_settlement} showArchiveInfo={true} />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading parish data:", error)
    return notFound()
  }
}
