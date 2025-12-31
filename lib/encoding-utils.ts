import iconv from 'iconv-lite';

/**
 * Encode string to Windows-1250 (Central European) for Metryki Wołyń API
 * Example: "Równe" -> "R%F3wne"
 */
export function encodeForMetryki(str: string): string {
  if (!str) return '';
  
  try {
    // Convert string to Windows-1250 bytes
    const buffer = iconv.encode(str, 'windows1250');
    
    // Convert each byte to percent-encoded format
    let encoded = '';
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      // Only encode non-ASCII bytes, keep ASCII letters as-is
      if (byte > 127) {
        encoded += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
      } else {
        encoded += String.fromCharCode(byte);
      }
    }
    
    return encoded;
  } catch (error) {
    console.error('Encoding error:', error);
    // Fallback to standard encodeURIComponent if encoding fails
    return encodeURIComponent(str);
  }
}
