"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import type { ReactNode } from "react"
import { useCountUp } from "@/hooks/use-count-up"
import { useEffect, useState } from "react"
import type { Statistics } from "@/lib/statistics"

interface StatisticsCardProps {
  title: string
  value: string
  icon: ReactNode
  description: string
  delay?: number
}

export function StatisticsCard({ title, value, icon, description, delay = 0 }: StatisticsCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const numericValue = Number.parseInt(value) || 0
  const isNumeric = !isNaN(numericValue) && value !== "..."

  const { count, isAnimating } = useCountUp({
    end: numericValue,
    duration: 2000,
    delay: delay,
    enabled: isVisible && isNumeric,
  })

  useEffect(() => {
    // Trigger animation when component mounts
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const displayValue = isNumeric ? count.toLocaleString() : value

  return (
    <Card
      className={`bg-white shadow-md hover:shadow-lg transition-all duration-500 transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 transition-all duration-300 ${
              isVisible ? "scale-100" : "scale-0"
            }`}
            style={{ transitionDelay: `${delay + 200}ms` }}
          >
            {icon}
          </div>
          <div>
            <h3
              className={`font-bold text-lg transition-all duration-300 ${
                isVisible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: `${delay + 300}ms` }}
            >
              {title}
            </h3>
          </div>
        </div>
        <div className="mt-2">
          <p
            className={`text-3xl font-bold transition-all duration-300 ${
              isAnimating ? "text-blue-600" : "text-gray-900"
            } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            style={{ transitionDelay: `${delay + 400}ms` }}
          >
            {displayValue}
          </p>
          <p
            className={`text-gray-500 text-sm mt-1 transition-all duration-300 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            style={{ transitionDelay: `${delay + 500}ms` }}
          >
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Компонент для відображення статистики в стилі оригінального дизайну з анімаціями
interface LegacyStatisticsCardProps {
  statistics: Statistics
}

export default function LegacyStatisticsCard({ statistics }: LegacyStatisticsCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  const parishesCount = useCountUp({
    end: statistics.parishes,
    duration: 2000,
    delay: 500,
    enabled: isVisible,
  })

  const regionsCount = useCountUp({
    end: statistics.regions,
    duration: 1500,
    delay: 700,
    enabled: isVisible,
  })

  const booksCount = useCountUp({
    end: statistics.books,
    duration: 2500,
    delay: 900,
    enabled: isVisible,
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card
      className={`bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl border-0 transition-all duration-700 transform ${
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Статистика</h3>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-white/80">Парафій:</span>
            <span
              className={`font-bold transition-colors duration-300 ${parishesCount.isAnimating ? "text-yellow-200" : "text-white"}`}
            >
              {parishesCount.count.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Областей:</span>
            <span
              className={`font-bold transition-colors duration-300 ${regionsCount.isAnimating ? "text-yellow-200" : "text-white"}`}
            >
              {regionsCount.count}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Книг:</span>
            <span
              className={`font-bold transition-colors duration-300 ${booksCount.isAnimating ? "text-yellow-200" : "text-white"}`}
            >
              {booksCount.count.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
