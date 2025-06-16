import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Building2, ArrowRight } from "lucide-react"
import { HierarchyBreadcrumbs } from "@/components/hierarchy-breadcrumbs"
import { sortByName } from "@/lib/sort-utils"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/env"
import { getHierarchyUrl,normalizeForUrl, safeDecodeURIComponent, safeDeNormalizeURIComponent } from "@/lib/url-utils"
import { sharedMetadata } from '@/shared/metadata'
interface District {
  id: string
  name: string
  hromadas?: any[]
}

// Generate static params for all regions
export async function generateStaticParams() {
  try {
    const data = await import("@/data/parafii_tree.json").then((module) => module.default)

    return data
      .filter((region: any) => !region.name.includes("Інші"))
      .map((region: any) => {
        return {
          region: normalizeForUrl(region.name),
        }
      })
  } catch (error) {
    console.error("Error generating static params for regions:", error)
    return []
  }
}

async function findRegion(regionName: string) {
    const data = await import("@/data/parafii_tree.json").then((module) => module.default)

    const region = data.find((r: any) => normalizeForUrl(r.name) === normalizeForUrl(regionName))

    return region
}

export async function generateMetadata({ params }: { params: { region: string } }): Promise<Metadata>{
  const { region } = await params
  const regionName = safeDeNormalizeURIComponent(region)
  
  const title = `Метричні книги - ${regionName}`
  const description = `Перегляд метричних книг регіону ${regionName} з архіву ДАРО`
  
  return {
        title:title,
        description:description,
        openGraph: {
          ...sharedMetadata.openGraph,
          title:title,
          description:description,
          url: `${siteConfig.url}${getHierarchyUrl(regionName)}`,
        },
        twitter: {
          ...sharedMetadata.twitter,
          title:title,
          description:description,
        },
      }
}

export default async function RegionPage({ params }: { params: { region: string } }) {
  try {
    
    const { region } = await params
    const decodedRegionName = safeDecodeURIComponent(region)
    //console.log("Looking for region:", decodedRegionName)
    // console.log(
    //   "Available regions:",
    //   data.map((r: any) => r.name),
    // )

    // Перенаправляємо на окрему сторінку для області "Інші"
    if (decodedRegionName === "Інші") {
      return notFound()
    }

    const regionItem = await findRegion(decodedRegionName)

    if (!regionItem) {
      console.error("Region not found:", decodedRegionName)
      return notFound()
    }

    const regionName = regionItem.name
    const sortedDistricts = sortByName(regionItem.districts || [])

    const breadcrumbItems = [{ label: regionName }]

    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="container mx-auto px-4">
          <HierarchyBreadcrumbs items={breadcrumbItems} />

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {regionName}
            </h1>
            <p className="text-muted-foreground text-lg">Оберіть район для перегляду громад</p>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            <Button asChild variant="outline" className="mb-6">
              <Link href="/hierarchy" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Повернутися до областей
              </Link>
            </Button>

            {sortedDistricts.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Райони не знайдено</h3>
                <p className="text-gray-500">У цій області немає доступних районів</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedDistricts.map((district: District, index: number) => (
                  <Card
                    key={district.id || index}
                    className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-800">{district.name}</CardTitle>
                          <CardDescription>{district.hromadas?.length || 0} громад</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 flex justify-end">
                      <Button asChild size="sm">
                        <Link

                          href={{
                              pathname: getHierarchyUrl(regionName,district.name),
                            }}
                          className="flex items-center gap-2"
                        >
                          <span>Переглянути громади</span>
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
    console.error("Error loading region data:", error)
    return notFound()
  }
}
