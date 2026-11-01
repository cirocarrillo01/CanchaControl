# generar-reporte.ps1
# Uso: .\generar-reporte.ps1
# Genera reporte.txt con el árbol y el contenido de los archivos del proyecto.
# Copiar el resultado al portapapeles
# Get-Content reporte.txt -Raw | Set-Clipboard

$rootPath = $PWD.Path
$outputFile = Join-Path $rootPath "reporte.txt"

# Carpetas a ignorar
$excludeDirs = @('node_modules', '.git', 'dist', 'build', '.vite', 'coverage', '.next')

# Archivos a ignorar (por nombre)
$excludeFiles = @('.env', '.env.local', '.env.production', 'package-lock.json', 'yarn.lock', 'reporte.txt')

# Extensiones a incluir (opcional: vacío = todas)
$includeExtensions = @('.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.md', '.env.example')

function Test-Excluded {
    param($path)
    foreach ($dir in $excludeDirs) {
        if ($path -match "\\$dir(\\|$)") { return $true }
    }
    $name = Split-Path $path -Leaf
    if ($excludeFiles -contains $name) { return $true }
    return $false
}

# Abrir archivo de salida
"" | Out-File $outputFile -Encoding UTF8

# Encabezado
Add-Content $outputFile "=========================================="
Add-Content $outputFile "REPORTE DEL PROYECTO"
Add-Content $outputFile "Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Content $outputFile "Raíz: $rootPath"
Add-Content $outputFile "=========================================="
Add-Content $outputFile ""

# --- 1. ÁRBOL DE DIRECTORIOS ---
Add-Content $outputFile "=========================================="
Add-Content $outputFile "ÁRBOL DE DIRECTORIOS"
Add-Content $outputFile "=========================================="
Add-Content $outputFile ""

Get-ChildItem -Recurse -File $rootPath | Where-Object {
    -not (Test-Excluded $_.FullName)
} | ForEach-Object {
    $rel = $_.FullName.Replace("$rootPath\", "")
    Add-Content $outputFile $rel
}

Add-Content $outputFile ""
Add-Content $outputFile ""

# --- 2. CONTENIDO DE ARCHIVOS ---
Add-Content $outputFile "=========================================="
Add-Content $outputFile "CONTENIDO DE ARCHIVOS"
Add-Content $outputFile "=========================================="
Add-Content $outputFile ""

Get-ChildItem -Recurse -File $rootPath | Where-Object {
    -not (Test-Excluded $_.FullName) -and
    ($includeExtensions.Count -eq 0 -or $includeExtensions -contains $_.Extension)
} | ForEach-Object {
    $rel = $_.FullName.Replace("$rootPath\", "")
    Add-Content $outputFile ""
    Add-Content $outputFile "//=========================================="
    Add-Content $outputFile "// FILE: $rel"
    Add-Content $outputFile "//=========================================="
    try {
        Get-Content $_.FullName -Raw -Encoding UTF8 | Add-Content $outputFile
    } catch {
        Add-Content $outputFile "[ERROR leyendo archivo: $_]"
    }
    Add-Content $outputFile ""
    Add-Content $outputFile ""
}

Write-Host ""
Write-Host "✅ Reporte generado: $outputFile" -ForegroundColor Green
Write-Host "   Tamaño: $([math]::Round((Get-Item $outputFile).Length / 1KB, 2)) KB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cópialo con:  Get-Content reporte.txt | Set-Clipboard" -ForegroundColor Yellow