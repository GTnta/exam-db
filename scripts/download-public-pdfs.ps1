$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourcesPath = Join-Path $root "data\sources.json"
$sources = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourcesPath | ConvertFrom-Json

foreach ($source in $sources) {
    if ([string]::IsNullOrWhiteSpace($source.local_path) -or -not $source.local_path.EndsWith(".pdf")) {
        continue
    }

    $destination = Join-Path $root $source.local_path
    $destinationDir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null

    if (Test-Path -LiteralPath $destination) {
        Write-Host "skip $($source.local_path)"
        continue
    }

    Write-Host "download $($source.subject) $($source.kind) $($source.year) -> $($source.local_path)"
    try {
        Invoke-WebRequest -Uri $source.url -OutFile $destination
    }
    catch {
        Write-Warning "failed $($source.local_path): $($_.Exception.Message)"
    }
}

Write-Host "done"
