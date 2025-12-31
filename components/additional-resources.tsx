import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
/**
 * Encode string to Windows-1250 for Metryki Wołyń API
 * Example: "Równe" -> "R%F3wne"
 */
function encodeForMetryki(str: string): string {
  if (!str) return '';
  
  let encoded = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = char.charCodeAt(0);
    
    // Map of Unicode characters to Windows-1250 byte values
    const cp1250Map: { [key: number]: number } = {
      0x0104: 0xA5, // Ą
      0x0105: 0xB9, // ą
      0x0106: 0xC6, // Ć
      0x0107: 0xE6, // ć
      0x0118: 0xCA, // Ę
      0x0119: 0xEA, // ę
      0x0141: 0xA3, // Ł
      0x0142: 0xB3, // ł
      0x0143: 0xD1, // Ń
      0x0144: 0xF1, // ń
      0x00D3: 0xD3, // Ó
      0x00F3: 0xF3, // ó
      0x015A: 0xA6, // Ś
      0x015B: 0xB6, // ś
      0x0179: 0x8C, // Ź
      0x017A: 0x9C, // ź
      0x017B: 0x8F, // Ż
      0x017C: 0x9F, // ż
    };
    
    if (code < 128) {
      // ASCII characters - keep as-is
      encoded += char;
    } else if (cp1250Map[code]) {
      // Special Polish/Central European characters
      const byte = cp1250Map[code];
      encoded += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
    } else {
      // Fallback to UTF-8 encoding
      const utf8 = new TextEncoder().encode(char);
      for (const byte of utf8) {
        encoded += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
      }
    }
  }
  
  return encoded;
}

interface RomanCatholicData {
  query?: string
  geneteka?: string
}

interface AdditionalResourcesProps {
  searchTerm?: string
  showArchiveInfo?: boolean
  religion?: string
  parishId?: string
  romanCatholicData?: RomanCatholicData
}

export function AdditionalResources({ 
  searchTerm, 
  showArchiveInfo = true,
  religion,
  parishId,
  romanCatholicData
}: AdditionalResourcesProps) {
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

        {/* Roman Catholic Resources */}
        {religion === "roman_catholic" && (
          <>
            <div className="border-t my-6 pt-6">
              <h3 className="text-lg font-semibold mb-4">Індекси католицьких костелів</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" asChild>
                  <a
                    href={
                      romanCatholicData?.query
                          ? `https://wolyn-metryki.pl/Wolyn/index.php?para_szuk=${encodeForMetryki(romanCatholicData.query)}`
                        : "https://wolyn-metryki.pl/Wolyn/index.php"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Metryki Wołyń
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={
                      romanCatholicData?.geneteka
                        ? `https://geneteka.genealodzy.pl/index.php?op=gt&lang=&w=21uk&rid=${romanCatholicData.geneteka}`
                        : "https://geneteka.genealodzy.pl/index.php?op=gt&lang=pol&w=21uk"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Geneteka baza Genealogiczna
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
