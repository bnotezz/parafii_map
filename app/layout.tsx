import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ModernHeader from "@/components/modern-header"
import ModernFooter from "@/components/modern-footer"
import { GoogleTagManager } from "@next/third-parties/google"
import { sharedMetadata } from '@/shared/metadata'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
 ...sharedMetadata
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#5B4BF2' },
    { media: '(prefers-color-scheme: dark)',  color: '#1e1b4b' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
          <ModernHeader />
          <main className="relative flex-1">{children}</main>

          {/* Decorative background elements */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-indigo-200/20 rounded-full blur-2xl"></div>
          </div>

          <ModernFooter />
        </div>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  )
}
