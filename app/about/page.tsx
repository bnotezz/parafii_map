import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, ExternalLink } from "lucide-react"
import { AdditionalResources } from "@/components/additional-resources"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/env"
import { sharedMetadata } from '@/shared/metadata'
export function generateMetadata({ params }: { params: { id: string } }): Metadata{
  return {
      title: "Про проєкт",
      description: "Інформація про проєкт перегляду метричних книг з архіву ДАРО",
      openGraph: {
        ...sharedMetadata.openGraph,
        title: "Про проєкт",
        description: "Інформація про проєкт перегляду метричних книг з архіву ДАРО",
        url: `${siteConfig.url}/about`,
      },
      twitter: {
        ...sharedMetadata.twitter,
        title: "Про проєкт",
        description: "Інформація про проєкт перегляду метричних книг з архіву ДАРО",
      },
    }
}

export const dynamic = 'force-static';
export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Про проєкт</h1>
          <p className="text-xl text-muted-foreground">Цифровий архів метричних книг ДАРО</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Мета проєкту</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              Цей проєкт створено для полегшення доступу до оцифрованих метричних книг (церковних книг народжень, шлюбів
              та смертей) з архіву Державного архіву Рівненської області (ДАРО).
            </p>
            <p>
              Метричні книги є важливим джерелом для генеалогічних досліджень та вивчення історії родин. Завдяки
              цифровізації та систематизації цих документів, дослідники можуть легко знаходити необхідну інформацію про
              своїх предків.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Особливості сайту</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span>Інтерактивна мапа парафій з географічною прив&apos;язкою</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span>Ієрархічна навігація за адміністративним поділом</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span>Пошук парафій за назвою населеного пункту</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span>Детальна інформація про кожну парафію та наявні книги</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                <span>Адаптивний дизайн для мобільних пристроїв</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Джерела даних</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Державний архів Рівненської області (ДАРО)</h4>
              <p className="text-muted-foreground mb-3">
                Основне джерело оцифрованих метричних книг та архівних документів.
              </p>
              <a
                href="https://rv.archives.gov.ua/ocifrovani-sprav?period=5&&fund=5"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Оцифровані справи ДАРО
              </a>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Каталог метричних книг</h4>
              <p className="text-muted-foreground mb-3">
                Для створення сайту був використаний Каталог метричних книг, що зберігаються в Державному архіві
                Рівненської області.
              </p>
              <a
                href="https://rv.archives.gov.ua/dovidkovyj-aparat"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Довідковий апарат ДАРО
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <AdditionalResources showArchiveInfo={true} />

         <Card>
          <CardHeader>
            <CardTitle>Технічна реалізація</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Сайт створено з використанням сучасних веб-технологій:</p>
            <ul className="space-y-2">
              <li>
                <strong>Next.js</strong> - React фреймворк для статичної генерації
              </li>
              <li>
                <strong>shadcn/UI</strong> - компоненти інтерфейсу
              </li>
              <li>
                <strong>Leaflet.js</strong> - інтерактивні карти
              </li>
              <li>
                <strong>Tailwind CSS</strong> - стилізація
              </li>
            </ul>
            <div className="mt-4">
              <a
                href="https://github.com/bnotezz/parafii_map"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <Github className="h-4 w-4" />
                Вихідний код на GitHub
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
