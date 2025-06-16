import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Users, ArrowRight } from "lucide-react"
import { HierarchyBreadcrumbs } from "@/components/hierarchy-breadcrumbs"
import { sortByName } from "@/lib/sort-utils"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/env"
import { sharedMetadata } from '@/shared/metadata'
import { getHierarchyUrl,normalizeForUrl } from "@/lib/url-utils"
interface Hromada {
  id: string
  name: string
  settlements?: any[]
}

// Generate static params for all districts
export async function generateStaticParams() {
  try {
    const data = await import("@/data/parafii_tree.json").then((module) => module.default)

    const params: { region: string; district: string }[] = []

    data.forEach((region: any) => {
      if (!region.name.includes("Інші")) {
        region.districts?.forEach((district: any) => {
          params.push({
            region: normalizeForUrl(region.name),
            district: normalizeForUrl(district.name),
          })
        })
      }
    })

    return params
  } catch (error) {
    console.error("Error generating static params for districts:", error)
    return []
  }
}

export async function generateMetadata({
  params,
}: { params: { region: string; district: string } }): Promise<Metadata>{
  const { region,district } = await params
  const [regionItem, districtItem] = await findRegionAndDistrict(region, district)

  const title = `Метричні книги - ${regionItem?.name ?? ""}, ${districtItem?.name??""}`
  const description = `Перегляд метричних книг району ${districtItem?.name??""} регіону ${regionItem?.name??""} з архіву ДАРО`

  return {
        title:title,
        description:description,
        openGraph: {
          ...sharedMetadata.openGraph,
          title:title,
          description:description,
          url: `${siteConfig.url}/hierarchy/${region}/${district})}`,
        },
        twitter: {
          ...sharedMetadata.twitter,
          title:title,
          description:description,
        },
      }
}

async function findRegionAndDistrict(
      regionSlug: string,
      districtSlug: string
    ): Promise<[any, any]> {

      const data = await import("@/data/parafii_tree.json").then((module) => module.default)
      const region = data.find((r) => normalizeForUrl(r.name) === regionSlug)
      if (!region) return [undefined, undefined]
      const district = region.districts?.find((d: any) => normalizeForUrl(d.name) === districtSlug)
      return [region, district]
    }

export default async function DistrictPage({ params }: { params: { region: string; district: string } }) {
  try {
    const { region,district } = await params

    const [regionItem, districtItem] = await findRegionAndDistrict(region, district)
    if (!regionItem) {
      console.error("Region not found:", region)
      return notFound()
    }
    if (!districtItem) {
      console.error("District not found:", district)
      return notFound()
    }

    const regionName = regionItem.name
    const districtName = districtItem.name
    const sortedHromadas = sortByName(districtItem.hromadas || [])

    const breadcrumbItems = [
      {
        label: regionName,
        href: getHierarchyUrl(region),
      },
      { label: districtName },
    ]

    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="container mx-auto px-4">
          <HierarchyBreadcrumbs items={breadcrumbItems} />

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {districtName}
            </h1>
            <p className="text-muted-foreground text-lg">Оберіть громаду для перегляду населених пунктів</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <Button asChild variant="outline" className="mb-6">
              <Link 
                 href={{
                              pathname: getHierarchyUrl(regionName),
                            }}
                className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Повернутися до районів
              </Link>
            </Button>

            {sortedHromadas.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Громади не знайдено</h3>
                <p className="text-gray-500">У цьому районі немає доступних громад</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedHromadas.map((hromada: Hromada, index: number) => (
                  <Card
                    key={hromada.id || index}
                    className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-800">{hromada.name}</CardTitle>
                          <CardDescription>{hromada.settlements?.length || 0} населених пунктів</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <Button asChild size="sm">
                        <Link
                           href={{
                              pathname: getHierarchyUrl(regionName,districtName,hromada.name),
                            }}
                            className="flex items-center gap-2"
                        >
                          <span>Переглянути населені пункти</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading district data:", error)
    return notFound()
  }
}
