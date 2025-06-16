import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

interface AdditionalResourcesProps {
  searchTerm?: string
  showArchiveInfo?: boolean
}

export function AdditionalResources({ searchTerm, showArchiveInfo = true }: AdditionalResourcesProps) {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Додаткові ресурси для пошуку метричних книг</CardTitle>
        <CardDescription>
          {searchTerm
            ? `Інші сайти, де можна знайти метричні книги ${searchTerm}`
            : "Інші сайти, де можна знайти метричні книги населених пунктів Рівненської області"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showArchiveInfo && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Важливо:</strong> Багато метричних книг населених пунктів Рівненської області зберігаються в
              Житомирському архіві та інших регіональних і центральних архівах України. На цьому сайті представлені лише
              книги з фондів ДАРО (Державний архів Рівненської області).
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <Button variant="outline" asChild>
            <a
              href={searchTerm ? `https://ridni.org/catalog/${searchTerm}` : "https://ridni.org"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Пошук на ridni.org
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={searchTerm ? `https://genealogia.com.ua/?s=${searchTerm}` : "https://genealogia.com.ua"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Пошук на genealogia.com.ua
            </a>
          </Button>
           <Button variant="outline" asChild>
            <a
              href="https://uk.m.wikisource.org/wiki/%D0%90%D1%80%D1%85%D1%96%D0%B2:%D0%94%D0%90%D0%96%D0%9E"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Вікіджерела
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://inspector.duckarchive.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Качиний Інспектор
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
