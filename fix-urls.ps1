# Script para corregir URLs mal formateadas en archivos TypeScript

function Fix-ApiUrl {
    param([string]$filePath)
    
    if (-not (Test-Path $filePath)) {
        Write-Host "Archivo no encontrado: $filePath" -ForegroundColor Red
        return
    }
    
    Write-Host "Procesando: $filePath" -ForegroundColor Yellow
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Corregir: axios.get(${API_URL}/... → axios.get(`${API_URL}/...
    $content = $content -replace '\.get\(\$\{API_URL\}/', '.get(`${API_URL}/'
    $content = $content -replace '\.post\(\$\{API_URL\}/', '.post(`${API_URL}/'
    $content = $content -replace '\.put\(\$\{API_URL\}/', '.put(`${API_URL}/'
    $content = $content -replace '\.delete\(\$\{API_URL\}/', '.delete(`${API_URL}/'
    
    # Corregir: = ${API_URL}/... → = `${API_URL}/...
    $content = $content -replace ' = \$\{API_URL\}/', ' = `${API_URL}/'
    $content = $content -replace 'const url = \$\{API_URL\}/', 'const url = `${API_URL}/'
    $content = $content -replace 'let url = \$\{API_URL\}/', 'let url = `${API_URL}/'
    
    # Corregir comillas finales: /path'` → /path`
    $content = $content -replace "/([a-zA-Z0-9/\$\{\}\?\&\=\-_]+)'`", '/$1`'
    
    if ($content -ne $originalContent) {
        $content | Set-Content $filePath -NoNewline -Encoding UTF8
        Write-Host "  ✓ Corregido" -ForegroundColor Green
    } else {
        Write-Host "  Sin cambios" -ForegroundColor Gray
    }
}

# Archivos a corregir
$files = @(
    "c:\Users\estef\Desktop\Maestria\Lenguajes Web 2\www-metpre\app\components\MermasContent.tsx",
    "c:\Users\estef\Desktop\Maestria\Lenguajes Web 2\www-metpre\app\components\AperturaCierresContent.tsx",
    "c:\Users\estef\Desktop\Maestria\Lenguajes Web 2\www-metpre\app\apertura-cierres\page.tsx"
)

foreach ($file in $files) {
    Fix-ApiUrl -filePath $file
}

Write-Host "`n✓ Proceso completado" -ForegroundColor Green
