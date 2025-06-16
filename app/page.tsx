import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Database, Clock } from "lucide-react"
import { getStatistics } from "@/lib/statistics"
import ParishMapSection from "@/components/parish-map-section"
import type { Metadata } from 'next'
// Force static rendering
export const dynamic = 'force-static'
export const revalidate = false

export function generateMetadata(): Metadata{
  return {
    verification: {
      google: "google-site-verification-code", // Replace with actual verification code
      microsoft: "microsoft-site-verification-code", // Replace with actual verification code
    },
  }
}

export default async function HomePage() {
  const statistics = await getStatistics()

  return (
    <div className="min-h-[calc(100vh-64px)] p-4">
      <div className="container mx-auto h-full">
        <div className="grid lg:grid-cols-4 gap-6 h-full">
          {/* Map Section - Client Component */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-120px)] shadow-2xl border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0 h-full">
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                          <MapPin className="h-8 w-8 text-blue-600 animate-pulse" />
                        </div>
                        <p className="text-blue-700 font-medium">Завантаження...</p>
                      </div>
                    </div>
                  }
                >
                  <ParishMapSection className="h-full" />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Info Panel - Static Server Component */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Метричні книги</h3>
                    <p className="text-white/80 text-sm">ДАРО</p>
                  </div>
                </div>
                <p className="text-white/90 text-sm leading-relaxed">
                  Інтерактивна мапа парафій з доступом до оцифрованих метричних книг Державного архіву Рівненської
                  області.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Як користуватися</h3>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Натисніть на маркер для перегляду інформації про парафію</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Використовуйте пошук для знаходження конкретного населеного пункту</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Переглядайте ієрархічний список всіх парафій</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Статистика каталогу ДАРО</h3>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/80">Парафій:</span>
                    <span className="font-bold">{statistics.parishes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">Сканів на сайті ДАРО:</span>
                    <span className="font-bold">{statistics.digitalCopies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">Метричних книг:</span>
                    <span className="font-bold">{statistics.books}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
