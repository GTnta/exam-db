$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourcesPath = Join-Path $root "data\sources.json"
$sources = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourcesPath | ConvertFrom-Json

foreach ($source in $sources) {
    $destination = Join-Path $root $source.local_path
    $destinationDir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null

    if (Test-Path -LiteralPath $destination) {
        Write-Host "skip $($source.local_path)"
        continue
    }

    Write-Host "download $($source.subject) $($source.kind) $($source.year) -> $($source.local_path)"
    Invoke-WebRequest -Uri $source.url -OutFile $destination
}

Write-Host "done"
