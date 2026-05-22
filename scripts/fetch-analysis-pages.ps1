$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourcesPath = Join-Path $root "data\sources.json"
$outDir = Join-Path $root "worklogs\analysis-pages"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sources = Get-Content -Raw -Encoding UTF8 $sourcesPath | ConvertFrom-Json
$analysisSources = $sources | Where-Object { $_.kind -eq "analysis" } | Sort-Object year, subject

foreach ($source in $analysisSources) {
  $fileSubject = ($source.subject -replace "[^\p{L}\p{Nd}]+", "_")
  $file = Join-Path $outDir ("{0}_{1}_{2}_{3}.html" -f $source.year, $source.session, $fileSubject, $source.source_name)
  $url = ($source.url -replace "#.*$", "")
  Write-Host "fetch $($source.year) $($source.subject) $url"
  & curl.exe -sSL --max-time 45 -o $file $url
}
