$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "app/product/[id]/page.tsx"

if (!(Test-Path -LiteralPath $path)) {
  Write-Host "HATA: app/product/[id]/page.tsx bulunamadı." -ForegroundColor Red
  exit 1
}

$content = Get-Content -LiteralPath $path -Raw -Encoding UTF8

# 1) Auth modal state'lerini ekle
$oldState = @'
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // USER & PURCHASE CHECK
'@

$newState = @'
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Giriş uyarı modalı
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState(
    "Bu işlem için giriş yapmanız gerekiyor."
  );

  // USER & PURCHASE CHECK
'@

if ($content.Contains($oldState) -and !$content.Contains("showAuthModal")) {
  $content = $content.Replace($oldState, $newState)
}

# 2) checkAuth fonksiyonunu direkt login yerine modal açacak hale getir
$oldCheckAuth = @'
  // Auth check
  const checkAuth = async () => {
    if (!currentUser) {
      alert("Bu işlem için giriş yapmalısınız!");
      router.push("/login");
      return null;
    }
    return currentUser;
  };
'@

$newCheckAuth = @'
  // Auth check
  const checkAuth = async (
    message = "Bu işlem için giriş yapmanız gerekiyor."
  ) => {
    if (currentUser) return currentUser;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setAuthModalMessage(message);
      setShowAuthModal(true);
      return null;
    }

    setCurrentUser(session.user);
    return session.user;
  };
'@

if ($content.Contains($oldCheckAuth)) {
  $content = $content.Replace($oldCheckAuth, $newCheckAuth)
}

# 3) checkAuth çağrılarına açıklayıcı mesajlar ekle
$content = $content.Replace(
  'const user = await checkAuth();`r`n    if (!user) return;`r`n`r`n    if (!comment.trim()) return alert("Lütfen bir yorum yazın.");',
  'const user = await checkAuth("Yorum yapabilmek için giriş yapmanız gerekiyor.");`r`n    if (!user) return;`r`n`r`n    if (!comment.trim()) return alert("Lütfen bir yorum yazın.");'
)

$content = $content.Replace(
  'const user = await checkAuth();`r`n    if (!user) return;`r`n`r`n    if (!questionText.trim()) return alert("Lütfen sorunuzu yazın.");',
  'const user = await checkAuth("Soru sorabilmek için giriş yapmanız gerekiyor.");`r`n    if (!user) return;`r`n`r`n    if (!questionText.trim()) return alert("Lütfen sorunuzu yazın.");'
)

# LF satır sonları için de aynı değişimler
$content = $content.Replace(
  "const user = await checkAuth();`n    if (!user) return;`n`n    if (!comment.trim()) return alert(`"Lütfen bir yorum yazın.`");",
  "const user = await checkAuth(`"Yorum yapabilmek için giriş yapmanız gerekiyor.`");`n    if (!user) return;`n`n    if (!comment.trim()) return alert(`"Lütfen bir yorum yazın.`");"
)

$content = $content.Replace(
  "const user = await checkAuth();`n    if (!user) return;`n`n    if (!questionText.trim()) return alert(`"Lütfen sorunuzu yazın.`");",
  "const user = await checkAuth(`"Soru sorabilmek için giriş yapmanız gerekiyor.`");`n    if (!user) return;`n`n    if (!questionText.trim()) return alert(`"Lütfen sorunuzu yazın.`");"
)

# 4) Soru Sor butonunu direkt modal açmak yerine auth kontrolünden geçirecek hale getir
$content = $content.Replace(
  'onClick={() => setShowQuestionModal(true)}',
  'onClick={async () => { const user = await checkAuth("Soru sorabilmek için giriş yapmanız gerekiyor."); if (user) setShowQuestionModal(true); }}'
)

# 5) Auth modalını Yorum Modalı'ndan önce ekle
$authModal = @'

      {/* GİRİŞ GEREKLİ MODALI */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-7 shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🔐
              </div>

              <h2 className="text-lg font-black uppercase tracking-tight text-black mb-3">
                Giriş Gerekli
              </h2>

              <p className="text-sm font-medium text-gray-600 leading-relaxed mb-6">
                {authModalMessage}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="w-full bg-gray-100 text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all"
                >
                  İptal
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full bg-black text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-all"
                >
                  Giriş Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
'@

$marker = "`n      {/* YORUM MODALI */}"
if ($content.Contains($marker) -and !$content.Contains("GİRİŞ GEREKLİ MODALI")) {
  $content = $content.Replace($marker, $authModal + $marker)
}

Set-Content -LiteralPath $path -Value $content -Encoding UTF8
Write-Host "Tamam: Ürün detay giriş modalı eklendi." -ForegroundColor Green
Write-Host "Sonraki adım: npm run build" -ForegroundColor Yellow
