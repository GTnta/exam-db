param(
  [string]$SourcePdf = 'data/pdf/2022_common_main_physics.pdf',
  [int]$Page = 4
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PdfiumRoot = 'C:\Program Files\NeeLaboratory\NeeView\Libraries'
$TempDir = Join-Path $Root 'data\_tmp\windows-ocr-test'
$ImagePath = Join-Path $TempDir "inspect-$Page.png"

$env:PATH = (Join-Path $PdfiumRoot 'x64') + ';' + $env:PATH
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -Path (Join-Path $PdfiumRoot 'PdfiumViewer.dll')

function Await($AsyncOperation, [Type]$ResultType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } |
    Select-Object -First 1
  $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($AsyncOperation))
  return $task.GetAwaiter().GetResult()
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
$document = [PdfiumViewer.PdfDocument]::Load((Join-Path $Root $SourcePdf))
try {
  $pageIndex = $Page - 1
  $pageSize = $document.PageSizes[$pageIndex]
  $widthPx = 2200
  $heightPx = [int][Math]::Round($widthPx * $pageSize.Height / $pageSize.Width)
  $bitmap = $document.Render($pageIndex, $widthPx, $heightPx, 200.0, 200.0, $true)
  $bitmap.Save($ImagePath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
finally {
  $document.Dispose()
}

$lang = [Windows.Globalization.Language, Windows.Foundation, ContentType=WindowsRuntime]::new('ja')
$engine = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]::TryCreateFromLanguage($lang)
$storageFile = Await ([Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime])
$stream = Await ($storageFile.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime])
$softwareBitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics, ContentType=WindowsRuntime])
$result = Await ($engine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType=WindowsRuntime])

Write-Output "image=$ImagePath"
Write-Output "text=$($result.Text.Substring(0, [Math]::Min(300, $result.Text.Length)))"
foreach ($line in $result.Lines) {
  $words = @($line.Words)
  for ($i = 0; $i -lt $words.Count; $i++) {
    $text = $words[$i].Text.Normalize([Text.NormalizationForm]::FormKC)
    $next = if ($i + 1 -lt $words.Count) { $words[$i + 1].Text.Normalize([Text.NormalizationForm]::FormKC) } else { '' }
    if ($text -match '^問\s*[0-9]?$' -or $text -match '^問[0-9]+$' -or ($text -eq '問' -and $next -match '^[0-9]+$')) {
      $rect = $words[$i].BoundingRect
      Write-Output ("candidate text={0} next={1} x={2:n1} y={3:n1} w={4:n1} h={5:n1} line={6}" -f $text, $next, $rect.X, $rect.Y, $rect.Width, $rect.Height, (($words | ForEach-Object { $_.Text }) -join ' '))
    }
  }
}
