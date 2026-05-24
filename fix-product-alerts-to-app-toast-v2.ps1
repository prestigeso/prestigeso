$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "app/product/[id]/page.tsx"

if (!(Test-Path -LiteralPath $path)) {
  Write-Host "ERROR: app/product/[id]/page.tsx not found." -ForegroundColor Red
  exit 1
}

$content = Get-Content -LiteralPath $path -Raw -Encoding UTF8

# Add global alert system import if missing.
if ($content -notmatch 'useAppAlert') {
  $content = $content.Replace(
    'import { useCart } from "@/context/CartContext";',
    'import { useCart } from "@/context/CartContext";' + "`r`n" + 'import { useAppAlert } from "@/context/AppAlertContext";'
  )
}

# Add hook inside ProductDetailPage if missing.
if ($content -notmatch 'const \{ showToast \} = useAppAlert\(\);') {
  $content = $content.Replace(
    'const { addToCart, setIsCartOpen } = useCart();',
    'const { addToCart, setIsCartOpen } = useCart();' + "`r`n" + '  const { showToast } = useAppAlert();'
  )
}

# Replace "return alert(...);" with toast + return.
$content = [regex]::Replace(
  $content,
  'return\s+alert\(([^;]+?)\);',
  'showToast($1, "warning"); return;'
)

# Replace plain "alert(...);" with toast.
$content = [regex]::Replace(
  $content,
  'alert\(([^;]+?)\);',
  'showToast($1, "info");'
)

# Make obvious success messages success-colored.
$content = $content.Replace('showToast("Ürün başarıyla sepete eklendi! 🛍️", "info");', 'showToast("Ürün başarıyla sepete eklendi.", "success");')
$content = $content.Replace('showToast("Değerlendirmeniz alındı! Yönetici onayından sonra yayınlanacaktır. 🌟", "info");', 'showToast("Değerlendirmeniz alındı. Yönetici onayından sonra yayınlanacaktır.", "success");')
$content = $content.Replace('showToast("Sorunuz satıcıya iletildi! Cevaplandığında burada görünecektir. 💬", "info");', 'showToast("Sorunuz satıcıya iletildi. Cevaplandığında burada görünecektir.", "success");')

# Make common validation messages warning-colored.
$content = $content.Replace('showToast("Yorum yapabilmek için bu ürünü satın almış olmanız gerekir.", "info");', 'showToast("Yorum yapabilmek için bu ürünü satın almış olmanız gerekir.", "warning");')
$content = $content.Replace('showToast("Yorum yapabilmek için ürünü satın almış olmanız gerekir.", "info");', 'showToast("Yorum yapabilmek için ürünü satın almış olmanız gerekir.", "warning");')
$content = $content.Replace('showToast("Lütfen bir yorum yazın.", "info");', 'showToast("Lütfen bir yorum yazın.", "warning");')
$content = $content.Replace('showToast("Lütfen sorunuzu yazın.", "info");', 'showToast("Lütfen sorunuzu yazın.", "warning");')
$content = $content.Replace('showToast("En fazla 3 fotoğraf yükleyebilirsiniz.", "info");', 'showToast("En fazla 3 fotoğraf yükleyebilirsiniz.", "warning");')
$content = $content.Replace('showToast("Fotoğraflar image/* formatında ve en fazla 5 MB olmalıdır.", "info");', 'showToast("Fotoğraflar image/* formatında ve en fazla 5 MB olmalıdır.", "warning");')

# Make concatenated error messages error-colored.
$content = $content.Replace('showToast("Hata: " + (err?.message || "Bilinmeyen hata"), "info");', 'showToast("Hata: " + (err?.message || "Bilinmeyen hata"), "error");')

Set-Content -LiteralPath $path -Value $content -Encoding UTF8

$remainingAlerts = Select-String -LiteralPath $path -Pattern 'alert\(' -AllMatches

if ($remainingAlerts) {
  Write-Host "WARNING: Some alert( usages are still present:" -ForegroundColor Yellow
  $remainingAlerts | ForEach-Object { Write-Host ($_.LineNumber.ToString() + ": " + $_.Line) -ForegroundColor Yellow }
} else {
  Write-Host "OK: app/product/[id]/page.tsx native alert usages removed." -ForegroundColor Green
}

Write-Host "Next step: npm run build" -ForegroundColor Yellow
