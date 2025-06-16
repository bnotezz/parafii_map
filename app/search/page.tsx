import { sharedMetadata } from '@/shared/metadata'
import type { Metadata } from "next"
import { siteConfig } from "@/lib/env"
import SearchComponent from '@/components/parish-search'


export function generateMetadata({ params }: { params: { id: string } }): Metadata{
  return {
      title: "Пошук парафій",
      description: "Пошук парафій за назвою населеного пункту",
      openGraph: {
        ...sharedMetadata.openGraph,
        title: "Пошук парафій",
        description: "Пошук парафій за назвою населеного пункту",
        url: `${siteConfig.url}/search`,
      },
      twitter: {
        ...sharedMetadata.twitter,
        title: "Пошук парафій",
        description: "Пошук парафій за назвою населеного пункту",
      },
    }
}

export const dynamic = 'force-static'
export const revalidate = false

export default function SearchPage() {
  return <SearchComponent />
}