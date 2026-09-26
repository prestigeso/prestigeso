/** Public, fixed diagnostic messages. Never return Google's response/token text. */
export function googleSearchFailure(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const failures: Record<string, { status: number; error: string; code: string }> = {
    GOOGLE_CONFIGURATION: { status: 503, code: 'configuration', error: 'Google bağlantı bilgileri eksik. Sunucudaki GSC değişkenlerini kontrol edin.' },
    GOOGLE_REAUTHORIZE: { status: 502, code: 'reauthorize', error: 'Google oturumu yenilenemedi. Client bilgilerini kontrol edin; izin süresi dolduysa veya iptal edildiyse yeni Refresh Token alın.' },
    GOOGLE_PERMISSION: { status: 502, code: 'permission', error: 'Google erişimi reddetti. Search Console mülk yetkisini, salt okunur OAuth kapsamını ve API etkinleştirmesini kontrol edin.' },
    GOOGLE_RATE_LIMIT: { status: 429, code: 'rate_limit', error: 'Google istek kotasına ulaşıldı. Bir süre bekleyip tekrar deneyin.' },
    GOOGLE_AUTH_OR_QUERY: { status: 502, code: 'query', error: 'Google sorguyu kabul etmedi. İstek kapsamını ve mülk yapılandırmasını kontrol edin.' },
    GOOGLE_SCHEMA: { status: 502, code: 'schema', error: 'Google yanıtı beklenen biçimde değil. Sonuç gösterilmedi; boş trafik sayılmadı.' },
  };
  return Object.hasOwn(failures, code) ? failures[code] : { status: 502, code: 'unavailable', error: 'Google servisine ulaşılamadı veya yanıt doğrulanamadı. Tekrar deneyin; boş rapor varsayılmadı.' };
}

/** Conservative final-data window, calendar arithmetic remains correct over DST. */
export function googleSearchWindow(days: 7 | 28 | 90, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const end = Date.parse(`${today}T00:00:00Z`) - 3 * 86400000;
  return { start: new Date(end - (days - 1) * 86400000).toISOString().slice(0, 10), end: new Date(end).toISOString().slice(0, 10) };
}
