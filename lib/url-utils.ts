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

export function safeEncodeURIComponent(str: string): string {
  try {
    return encodeURIComponent(str)
  } catch {
    return str
  }
}

// New function to normalize region names for URL matching
export function normalizeForUrl(str: string): string {
  return str.trim().replace(/\s+/g, " ")
}
