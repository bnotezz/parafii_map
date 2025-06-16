import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Metadata } from "next"
import { MapPin, Users, AlertCircle, ArrowRight } from "lucide-react"
import { sortRegions } from "@/lib/sort-utils"
import { siteConfig } from "@/lib/env"
import { sharedMetadata } from '@/shared/metadata'
import {getHierarchyUrl} from "@/lib/url-utils"
interface Region {
  name: string
  districts: District[]
}

interface District {
  name: string
  hromadas: Hromada[]
}

interface Hromada {
  name: string
  settlements: Settlement[]
}

interface Settlement {
  name: string
  parafii: Parish[]
}

interface Parish {
  id: string
  title: string
  church_settlement: string
  religion: string
}
async function getRegions() {
  const res = await import("@/data/parafii_tree.json").then((module) => module.default)
 
  return res
}

export function generateMetadata(): Metadata{
    const title = `Список парафій за адміністративним поділом`
    const description = `Список парафій за адміністративним поділом`
  
    return {
      title,
      description,
      openGraph: {
        ...sharedMetadata.openGraph,
        title:title,
        description:description,
          url: `${siteConfig.url}/hierarchy`,
      },
      twitter: {
        ...sharedMetadata.twitter,
        title:title,
        description:description,
      },
    }
}

export const dynamic = 'force-static';
export default async function HierarchyPage() {
  try {

    const data = await getRegions()
    //console.log("Завантажені дані:", data)

    if (!Array.isArray(data)) {
      console.error("Невідповідна структура даних:", data)
      return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Помилка завантаження</h2>
            <p className="text-gray-600">Невідповідна структура даних</p>
          </div>
        </div>
      )
    }

    // Сортуємо області з особливим порядком
    const sortedRegions = sortRegions(data)

    if (sortedRegions.length === 0) {
      return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Дані не знайдено</h2>
            <p className="text-gray-600">Файл порожній або має невірну структуру</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Список парафій
            </h1>
            <p className="text-muted-foreground text-lg">Оберіть область для перегляду районів та парафій</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {sortedRegions.map((region, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-800">{region.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {region.name === "Інші" ? "Парафії поза областю" : `${region.districts?.length || 0} районів`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex justify-end">
                  <Button asChild size="sm">
                    <Link
                       href={{
                              pathname: region.name === "Інші"?"/hierarchy/others":getHierarchyUrl(region.name),
                            }}
                      className="flex items-center gap-2">
                      <span>{region.name === "Інші" ? "Переглянути парафії" : "Переглянути райони"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading hierarchy data:", error)
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Помилка завантаження</h2>
          <p className="text-gray-600">{error instanceof Error ? error.message : "Невідома помилка"}</p>
        </div>
      </div>
    )
  }
}
