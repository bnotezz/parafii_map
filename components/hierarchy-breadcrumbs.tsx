import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface HierarchyBreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function HierarchyBreadcrumbs({ items }: HierarchyBreadcrumbsProps) {
  return (
    <nav
      className="
        flex items-center gap-2
        text-sm text-muted-foreground mb-4
        overflow-x-auto scrollbar-none
        whitespace-nowrap
        md:overflow-visible              
      "
    >
      <Link href="/hierarchy" className="hover:text-primary flex items-center gap-1">
        <Home className="h-4 w-4" />
        Список парафій
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 shrink-0">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-primary truncate max-w-[60vw]" title={item.label}>
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground truncate max-w-[60vw]" title={item.label}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
