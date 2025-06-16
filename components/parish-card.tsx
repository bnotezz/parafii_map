import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Church, MapPin, ArrowRight } from "lucide-react"
import { getReligionIcon, getReligionLabel, getReligionColor } from "@/lib/religion-utils"

interface Parish {
  id: string
  title: string
  church_settlement: string
  religion: string
  settlements?: string
  hromada_name?: string
  district_name?: string,
  region_name?: string,
  settlement?: string
}

interface ParishCardProps {
  parish: Parish
  showLocation?: boolean
}

export function ParishCard({ parish, showLocation = true }: ParishCardProps) {
  return (
    <Card className="w-full min-h-[176px] hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gray-50 rounded-lg border flex items-center justify-center flex-shrink-0">
            <i
              className={`fas fa-${getReligionIcon(parish.religion)} text-sm`}
              style={{ color: getReligionColor(parish.religion) }}
            ></i>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight mb-2 break-words">{parish.title}</CardTitle>
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Church className="h-3 w-3 flex-shrink-0" />
                <span
                  className="truncate"
                  title={
                    [parish.region_name, parish.district_name, parish.hromada_name, parish.settlement]
                      .filter(Boolean)
                      .join(" ")
                  }
                >
                  {parish.church_settlement}</span>
              </div>
              {showLocation && parish.settlements && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground" title={parish.settlements}>
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{parish.settlements}</span>
                </div>
              )}
              <Badge variant="secondary" className="text-xs">
                {getReligionLabel(parish.religion)}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex justify-end">
        <Button asChild size="sm">
          <Link href={`/parafia/${parish.id}`} className="flex items-center gap-2">
            <span>Переглянути деталі</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
