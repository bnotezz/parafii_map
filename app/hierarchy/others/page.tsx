import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Church, AlertCircle } from "lucide-react"
import { HierarchyBreadcrumbs } from "@/components/hierarchy-breadcrumbs"
import { ParishCard } from "@/components/parish-card"
import { getAllParishesFromOthers } from "@/lib/sort-utils"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/env"
import { sharedMetadata } from '@/shared/metadata'
interface Parish {
  id: string
  title: string
  church_settlement: string
  religion: string
  settlements: string
}
async function getRegions() {
  const res = await import("@/data/parafii_tree.json").then((module) => module.default)
 
  return res
}

export function generateMetadata(): Metadata{
    const title = `Інші`
    const description = `Перегляд метричних книг з інших регіонів з архіву ДАРО`
  
    return {
      title:title,
      description:description,
      openGraph: {
        ...sharedMetadata.openGraph,
        title:title,
        description:description,
          url: `${siteConfig.url}/hierarchy/others`,
      },
      twitter: {
        ...sharedMetadata.twitter,
        title:title,
        description:description,
      },
    }
}


export const dynamic = 'force-static';
export default async function OthersPage() {
  try {
    const data = await getRegions()
    //console.log("Завантажені дані:", data)
    //console.log("Шукаємо область 'Інші'...")

    const othersRegion = data.find((r: any) => r.name === "Інші")
    //console.log("Знайдена область 'Інші':", othersRegion)

    let parishes: Parish[] = []
    if (othersRegion) {
      parishes = getAllParishesFromOthers(othersRegion)
     // console.log("Парафії з області 'Інші':", parishes)
    } else {
      console.log("Область 'Інші' не знайдена в даних")
    }

    const breadcrumbItems = [{ label: "Інші" }]

    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="container mx-auto px-4">
          <HierarchyBreadcrumbs items={breadcrumbItems} />

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Інші
            </h1>
            <p className="text-muted-foreground text-lg">Парафії поза межами областей</p>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            <Button asChild variant="outline" className="mb-6">
              <Link href="/hierarchy" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Повернутися до областей
              </Link>
            </Button>

            {parishes.length === 0 ? (
              <div className="text-center py-8">
                <Church className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Парафії не знайдено</h3>
                <p className="text-gray-500">У цій області немає доступних парафій</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {parishes.map((parish) => (
                  <ParishCard key={parish.id} parish={parish} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading others data:", error)
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
