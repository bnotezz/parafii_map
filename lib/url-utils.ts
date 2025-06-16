export function normalizeForUrl(str:string){
  return encodeURIComponent(str.replaceAll(" ","-"));
}

export function getHierarchyUrl(region?:string,district?:string,hromada?:string){
  const urlParams = ["/hierarchy"];
  if(region){
    urlParams.push(normalizeForUrl(region));
    if(district){
      urlParams.push(normalizeForUrl(district));
      if(hromada){
        urlParams.push(normalizeForUrl(hromada));
      }
    }
  }
  return urlParams.join("/")
}

export function safeDeNormalizeURIComponent(str: string): string {
    return safeDecodeURIComponent(str).replaceAll(/\s+/g, " ");
}
export function safeDecodeURIComponent(str: string): string {
  try {
    // Спробуємо декодувати один раз
    let decoded = decodeURIComponent(str)

    // Якщо результат все ще містить закодовані символи, декодуємо ще раз
    if (decoded.includes("%")) {
      try {
        decoded = decodeURIComponent(decoded)
      } catch {
        // Якщо друге декодування не вдалося, повертаємо результат першого
      }
    }

    return decoded
  } catch {
    // Якщо декодування не вдалося, повертаємо оригінальний рядок
    return str
  }
}