"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, MapPin, Search, List, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { name: "Мапа", href: "/", icon: MapPin },
  { name: "Список парафій", href: "/hierarchy", icon: List },
  { name: "Пошук", href: "/search", icon: Search },
  { name: "Про проєкт", href: "/about", icon: Info },
]

export default function ModernHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header
      className="
        sticky top-0 z-50 w-full border-b
        bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700/90
        backdrop-blur-md shadow-lg
        pt-[env(safe-area-inset-top)]
      "
    >
      <div
        className="
          mx-auto flex h-16 max-w-screen-xl items-center gap-2
          px-4 sm:px-6 lg:px-8
        "
      >
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <MapPin className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 h-4 w-4 animate-pulse rounded-full bg-yellow-400"></span>
          </span>

          {/* Назва видно зі sm і вище */}
          <span className="hidden sm:block">
            <span className="block whitespace-nowrap text-base sm:text-lg md:text-xl font-bold text-white">
              Каталог метричних книг
            </span>
            <span className="block -mt-1 text-xs text-white/80">ДАРО</span>
          </span>
        </Link>

        {/* NAV (desktop ≥ md) */}
        <nav
          className="
            hidden md:flex flex-1 justify-center items-center gap-1
            overflow-x-auto
          "
        >
          {nav.map(({ name, href, icon: Icon }) => {
            const active =
              pathname === href || (href.length > 2 && pathname.startsWith(href))
            return (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 transition",
                    "text-white/90 hover:text-white hover:bg-white/20",
                    active && "bg-white/20 text-white shadow-lg"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{name}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* BURGER (menu < md) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto md:hidden shrink-0 rounded-xl text-white hover:bg-white/20"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="w-80 space-y-6 border-none bg-gradient-to-b from-blue-600 to-purple-700 p-6"
          >
            {/* Дублі логотипа / назви */}
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <MapPin className="h-6 w-6 text-white" />
              </span>
              <span>
                <span className="block text-lg font-bold text-white">Каталог метричних книг</span>
                <span className="block text-sm text-white/80">ДАРО</span>
              </span>
            </Link>

            {/* Навігація */}
            <nav className="space-y-3">
              {nav.map(({ name, href, icon: Icon }) => {
                const active =
                  pathname === href || (href.length > 2 && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3 text-white/90 transition",
                      "hover:bg-white/20 hover:text-white",
                      active && "bg-white/20 text-white shadow-lg"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-lg font-medium">{name}</span>
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
