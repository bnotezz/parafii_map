"use client"

import { useState, useMemo, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Loader2 } from "lucide-react"
import { ParishCard } from "@/components/parish-card"
import { useDebounce } from "@/hooks/use-debounce"
import { enhancedSearch } from "@/lib/search-utils"

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

function splitSettlements(settlements: string): string[] {
  return settlements
    .replace(/\p{L}+\s+вол\./giu, "")
    .replace(/\p{L}+\s+пов\./giu, "")
    .replace(/\p{L}+\s+гміни\./giu, "")
    .replace("сс. ", "")
    .replace("с. ", "")
    .replace("м. ", "")
    .replace("м-ко.? ", "")
    .split(/[;,]\s*/)
    .map((settlement) => settlement.trim())
    .filter((settlement) => settlement.length > 0)
}

function flattenPerishesData(data: any[]): Parish[] {
  return data.flatMap((region: any) =>
    region.districts.flatMap((district: any) =>
      district.hromadas.flatMap((hromada: any) =>
        hromada.settlements.flatMap((settlement: any) =>
          settlement.parafii.map((parish: any) => ({
            id: parish.id,
            parafiya: parish.title,
            religion: parish.religion,
            settlements_line: parish.settlements,
            settlements: splitSettlements(parish.settlements),
            church_settlement: parish.church_settlement,
            district: district.name.includes("Інші") ? "" : district.name,
            region: region.name.includes("Інші") ? "" : region.name,
            hromada: hromada.name.includes("Інші") ? "" : hromada.name,
            settlement: settlement.name.includes("Інші") ? "" : settlement.name,
          })),
        ),
      ),
    ),
  )
}


export default function SearchComponent() {
     const [searchTerm, setSearchTerm] = useState("")
  const [parishes, setParishes] = useState<Parish[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Load parish data once on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (parishes.length > 0) {
          setLoading(false)
          return
        }

        //console.time("Loading parishes")
        const response = await fetch("/data/parafii_tree.json")
        const data = await response.json()

        setParishes(flattenPerishesData(data))
        //console.timeEnd("Loading parishes")
      } catch (error) {
        console.error("Error loading parish data:", error)
        setParishes([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [parishes.length])

  // Set searching state when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm.length >= 3) {
      setSearching(true)
      const timer = setTimeout(() => {
        setSearching(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [debouncedSearchTerm])

  // Enhanced search with ranking
  const searchResults = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 3) return []

    console.time("Enhanced search")
    const results = enhancedSearch(parishes, debouncedSearchTerm)
    console.timeEnd("Enhanced search")

    return results
  }, [debouncedSearchTerm, parishes])

  // Transform data for ParishCard component
  const transformedParishes = useMemo(() => {
    return searchResults.map((result) => ({
      id: result.parish.id,
      title: result.parish.parafiya,
      church_settlement: result.parish.church_settlement,
      religion: result.parish.religion,
      settlements: result.parish.settlements_line,
      settlement: result.parish.settlement,
      hromada_name: result.parish.hromada,
      district_name: result.parish.district,
      region_name: result.parish.region,
    }))
  }, [searchResults])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <p className="text-blue-700 font-medium">Завантаження даних...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Пошук парафій
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            Введіть мінімум 3 символи для пошуку по населених пунктах
          </p>

          <div className="relative max-w-md mx-auto">
            {searching ? (
              <Loader2 className="absolute left-3 top-3 h-5 w-5 text-blue-500 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            )}
            <Input
              placeholder="Назва населеного пункту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg border-2 focus:border-blue-500 rounded-xl"
            />
          </div>
          {searchTerm && searchTerm.length < 3 && (
            <p className="text-sm text-amber-600 mt-2">
              Введіть ще {3 - searchTerm.length} {3 - searchTerm.length === 1 ? "символ" : "символи"} для початку пошуку
            </p>
          )}
        </div>

        {debouncedSearchTerm.length >= 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800">Результати пошуку ({searchResults.length})</h2>
            </div>

            {searchResults.length === 0 ? (
              <Card className="w-full min-h-[176px] max-w-md mx-auto shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground text-lg mb-2">Парафій не знайдено</p>
                  <p className="text-sm text-muted-foreground">
                    Спробуйте інший пошуковий запит або перевірте правопис
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                {transformedParishes.map((parish) => (
                  <ParishCard key={parish.id} parish={parish} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}