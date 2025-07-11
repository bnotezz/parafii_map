import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Church } from "lucide-react"
import { HierarchyBreadcrumbs } from "@/components/hierarchy-breadcrumbs"
import { sortParishes } from "@/lib/sort-utils"
import { ParishCard } from "@/components/parish-card"
import { AdditionalResources } from "@/components/additional-resources"
import { notFound } from "next/navigation"
import { Metadata } from 'next'
import { siteConfig } from "@/lib/env"
import { sharedMetadata } from '@/shared/metadata'
import { getHierarchyUrl, normalizeForUrl} from "@/lib/url-utils"
interface Parish {
  id: string
  title: string
  church_settlement: string
  religion: string
  settlements?: string
  hromada_name?: string
  district_name?: string
  region_name?: string
  settlement?: string
}

interface PageParams {
  region: string
  district: string
  hromada: string
}
export async function generateMetadata({
  params,
}: { params: { region: string; district: string; hromada: string } }): Promise<Metadata> {
  const { region,district,hromada } = await params

  const [regionItem, districtItem, hromadaItem] = await findRegionAndHromada(region, district,hromada)

  const regionName = regionItem?.name ?? ""
  const districtName = districtItem?.name ?? ""
  const hromadaName = hromadaItem?.name ?? ""

  const title = `Метричні книги - ${hromadaName}, ${districtName}, ${regionName}`
  const description = `Перегляд метричних книг громади ${hromadaName} району ${districtName} регіону ${regionName} з архіву ДАРО`

  return {
        title:title,
        description:description,
        openGraph: {
          ...sharedMetadata.openGraph,
          title:title,
          description:description,
          url: `${siteConfig.url}/hierarchy/${region}/${districtName}/${hromadaName}`,
        },
        twitter: {
          ...sharedMetadata.twitter,
          title:title,
          description:description,
        },
      }
}

// Generate static params for all hromadas
export async function generateStaticParams(): Promise<PageParams[]> {
  try {
    const data = await import("@/data/parafii_tree.json").then((module) => module.default)

    const params: { region: string; district: string; hromada: string }[] = []

    data.forEach((region: any) => {
      if (!region.name.includes("Інші")) {
        region.districts?.forEach((district: any) => {
          district.hromadas?.forEach((hromada: any) => {
            params.push({
              region: normalizeForUrl(region.name),
              district: normalizeForUrl(district.name),
              hromada: normalizeForUrl(hromada.name),
            })
          })
        })
      }
    })

    return params
  } catch (error) {
    console.error("Error generating static params for hromadas:", error)
    return []
  }
}

async function findRegionAndHromada(
      regionSlug: string,
      districtSlug: string,
      hromadaSlug: string
    ): Promise<[any, any, any]> {

      const data = await import("@/data/parafii_tree.json").then((module) => module.default)
      const region = data.find((r) => normalizeForUrl(r.name) === regionSlug)
      if (!region) return [undefined, undefined, undefined]
      const district = region.districts?.find((d: any) => normalizeForUrl(d.name) === districtSlug)
      if (!district) return [region, undefined, undefined]
      const hromada = district.hromadas?.find((h: any) => normalizeForUrl(h.name) === hromadaSlug)

      return [region, district, hromada]
    }

export default async function HromadaPage({
  params
}: {
  params: PageParams
}) {
  try {
    const { region,district,hromada } = await params
  
    const [regionItem, districtItem, hromadaItem] = await findRegionAndHromada(region, district,hromada)

    
    if (!regionItem) {
      console.error("Region not found:", region)
      return notFound()
    }

    const regionName = regionItem.name
    if (!districtItem) {
      console.error("District not found:", district)
      return notFound()
    }

    const districtName = districtItem.name
    if (!hromadaItem) {
      console.error("Hromada not found:", hromada)
      return notFound()
    }

    const hromadaName = hromadaItem.name

    // Збираємо всі парафії з усіх населених пунктів громади
    const allParishes: Parish[] = []
    if (hromadaItem.settlements) {
      hromadaItem.settlements.forEach((settlement: any) => {
        if (settlement.parafii) {
          settlement.parafii.forEach((parish: any) => {
            const parishData: Parish = {
              id: parish.id,
              title: parish.title,
              church_settlement: parish.church_settlement,
              religion: parish.religion,
              settlements: parish.settlements,
              hromada_name: hromadaItem.name,
              district_name: districtItem.name,
              region_name: regionItem.name,
              settlement: settlement.name,
            }
            allParishes.push(parishData)
          })
        }
      })
    }

    const parishes = sortParishes(allParishes)

    const breadcrumbItems = [
      {
        label: regionName,
        href: getHierarchyUrl(regionName),
      },
      {
        label: districtName,
        href: getHierarchyUrl(regionName,districtName),
      },
      { label: hromadaName },
    ]

    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="container mx-auto px-4">
          <HierarchyBreadcrumbs items={breadcrumbItems} />

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {hromadaName}
            </h1>
            <p className="text-muted-foreground text-lg">Парафії громади</p>
          </div>

          <div className="max-w-5xl mx-auto space-y-6">
            <Button asChild variant="outline" className="mb-6">
              <Link href={getHierarchyUrl(regionName,districtName)} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Повернутися до громад
              </Link>
            </Button>

            {parishes.length === 0 ? (
              <div className="text-center py-8">
                <Church className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Парафії не знайдено</h3>
                <p className="text-gray-500">У цій громаді немає доступних парафій</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {parishes.map((parish) => (
                  <ParishCard key={parish.id} parish={parish} />
                ))}
              </div>
            )}

            {/* Information about other archives */}
            <AdditionalResources showArchiveInfo={true} />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading hromada data:", error)
    return notFound()
  }
}
