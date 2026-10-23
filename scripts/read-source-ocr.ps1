# Run with Windows PowerShell 5.1, whose WinRT support is used by Media.Ocr.
param([int]$Limit = 0)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
function Await($Operation, [Type]$Type) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } |
    Select-Object -First 1
  return $method.MakeGenericMethod($Type).Invoke($null, @($Operation)).GetAwaiter().GetResult()
}
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$requests = Get-Content -LiteralPath (Join-Path $root 'data/_tmp/source-layout/ocr-requests.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$lang = [Windows.Globalization.Language, Windows.Foundation, ContentType=WindowsRuntime]::new('ja')
$engine = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]::TryCreateFromLanguage($lang)
if ($null -eq $engine) { throw 'Japanese Windows OCR is unavailable.' }
$done = 0
foreach ($request in $requests) {
  if (Test-Path -LiteralPath $request.output) { continue }
  $file = Await ([Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]::GetFileFromPathAsync($request.image)) ([Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime])
  $stream = Await ($file.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage, ContentType=WindowsRuntime])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics, ContentType=WindowsRuntime])
  $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType=WindowsRuntime])
  $width = [double]$bitmap.PixelWidth
  $height = [double]$bitmap.PixelHeight
  $lines = @($result.Lines | ForEach-Object {
    $words = @($_.Words)
    $left = ($words | ForEach-Object { $_.BoundingRect.X } | Measure-Object -Minimum).Minimum
    $top = ($words | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum
    $right = ($words | ForEach-Object { $_.BoundingRect.X + $_.BoundingRect.Width } | Measure-Object -Maximum).Maximum
    $bottom = ($words | ForEach-Object { $_.BoundingRect.Y + $_.BoundingRect.Height } | Measure-Object -Maximum).Maximum
    [ordered]@{text=($_.Words.Text -join ' '); x=$left/$width; y=$top/$height; right=$right/$width; bottom=$bottom/$height}
  })
  [ordered]@{pdf=$request.pdf; page=$request.page; method='windows-ocr'; lines=$lines} |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $request.output -Encoding UTF8
  $bitmap.Dispose()
  $stream.Dispose()
  $done++
  if ($done % 20 -eq 0) { Write-Output "ocr_pages=$done last=$($request.pdf):$($request.page)" }
  if ($Limit -gt 0 -and $done -ge $Limit) { break }
}
Write-Output "ocr_pages_completed=$done"
