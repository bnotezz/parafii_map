"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import Link from "next/link"
export default function ModernFooter() {
  const [emailRevealed, setEmailRevealed] = useState(false)

  // Email obfuscation to prevent spam
  const emailParts = ["bnotezz", "@", "gmail", ".", "com"]
  const revealEmail = () => {
    setEmailRevealed(true)
  }

  return (
    <footer className="bg-slate-50 border-t border-slate-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
          {/* Navigation Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            <Link
              href="/"
              className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-colors hover:underline underline-offset-4"
            >
              Головна
            </Link>
            <Link
              href="/search"
              className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-colors hover:underline underline-offset-4"
            >
              Пошук парафій
            </Link>
            <Link
              href="/hierarchy"
              className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-colors hover:underline underline-offset-4"
            >
              Список населених пунктів
            </Link>
            <Link
              href="/about"
              className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-colors hover:underline underline-offset-4"
            >
              Про проєкт
            </Link>
          </nav>

          {/* Contact */}
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <Mail className="h-4 w-4 text-blue-500" />
            {emailRevealed ? (
              <Link
                href={`mailto:${emailParts.join("")}`}
                className="text-slate-700 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                {emailParts.join("")}
              </Link>
            ) : (
              <button
                onClick={revealEmail}
                className="text-slate-600 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                Зв&apos;язатися з автором
              </button>
            )}
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            Каталог метричних книг Державного архіву Рівненської області • Неофіційний дослідницький проєкт
          </p>
        </div>
      </div>
    </footer>
  )
}
