"use client"

import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { MapPin } from "lucide-react"

// Dynamically import the map component to avoid SSR issues
const ParishMap = dynamic(() => import("@/components/parish-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
          <MapPin className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
        <p className="text-blue-700 font-medium">Завантаження карти...</p>
      </div>
    </div>
  ),
})

interface ParishMapSectionProps {
  className?: string
}

export default function ParishMapSection({ className }: ParishMapSectionProps) {
  const searchParams = useSearchParams()
  const focusParishId = searchParams.get("focus")

  return <ParishMap focusParishId={focusParishId || undefined} className={className} />
}
