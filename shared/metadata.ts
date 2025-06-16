import type { Metadata } from 'next'
import { siteConfig } from "@/lib/env"
 
export const sharedMetadata: Metadata = {
    title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  applicationName: siteConfig.name,
  description: siteConfig.description,
  keywords: ["метричні книги", "ДАРО", "архів", "генеалогія", "Рівненська область", "історія України"],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
      },
    ],
    locale: "uk_UA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  appleWebApp: {
    title: siteConfig.name,
    statusBarStyle: 'default',
    capable: true,
  },
  generator: "v0.dev",
}