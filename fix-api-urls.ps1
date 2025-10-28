# Script para corregir las URLs de API mal formateadas

$files = @(
    "app\dashboard\page.tsx",
    "app\valores\page.tsx",
    "app\usuarios\consulta.tsx",
    "app\components\ValoresContent.tsx"
)

foreach ($file in $files) {
    $fullPath = "c:\Users\estef\Desktop\Maestria\Lenguajes Web 2\www-metpre\$file"
    if (Test-Path $fullPath) {
        Write-Host "Procesando: $file"
        $content = Get-Content $fullPath -Raw
        
        # Corregir casos donde falta comilla invertida inicial
        $content = $content -replace '\$\{API_URL\}/([^`"'']+)[`''""]', '`${API_URL}/$1`'
        
        # Corregir casos donde falta comilla invertida al inicio
        $content = $content -replace '= \$\{API_URL\}/', '= `${API_URL}/'
        
        # Corregir la definición en usuarios/consulta.tsx
        $content = $content -replace 'process\.env\.NEXT_PUBLIC_API_URL \|\| \$\{API_URL\}"', 'process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"'
        
        $content | Set-Content $fullPath -NoNewline
        Write-Host "  ✓ Corregido"
    }
}

Write-Host "`nTodos los archivos han sido corregidos."
