$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PdfiumRoot = 'C:\Program Files\NeeLaboratory\NeeView\Libraries'
$env:PATH = (Join-Path $PdfiumRoot 'x64') + ';' + $env:PATH

Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PdfiumRoot 'PdfiumViewer.dll')

$pdfRel = 'data/pdf/2014_center_main_physics1.pdf'
$outputRel = 'data/images/questions/2014_center_main_physics1_a21.jpg'
$pdfPath = Join-Path $Root $pdfRel
$outputPath = Join-Path $Root $outputRel

function Save-Jpeg($Bitmap, [string]$Path, [long]$Quality) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
  $Bitmap.Save($Path, $codec, $params)
  $params.Dispose()
}

$doc = [PdfiumViewer.PdfDocument]::Load($pdfPath)
try {
  $pdfPage = 26
  $pageIndex = $pdfPage - 1
  $pageSize = $doc.PageSizes[$pageIndex]
  $widthPx = 1600
  $heightPx = [int][Math]::Round($widthPx * $pageSize.Height / $pageSize.Width)
  $image = $doc.Render($pageIndex, $widthPx, $heightPx, 144.0, 144.0, $true)
  try {
    $x = [int][Math]::Round(0.055 * $image.Width)
    $w = [int][Math]::Round(0.89 * $image.Width)
    $top = 0.035
    $bottom = 0.243889
    $y = [int][Math]::Round($top * $image.Height)
    $h = [int][Math]::Round(($bottom - $top) * $image.Height)
    $rect = New-Object System.Drawing.Rectangle($x, $y, [Math]::Min($w, $image.Width - $x), $h)
    $crop = $image.Clone($rect, $image.PixelFormat)
    try {
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
      Save-Jpeg $crop $outputPath 72
    } finally {
      $crop.Dispose()
    }
  } finally {
    $image.Dispose()
  }
} finally {
  $doc.Dispose()
}

$questionsPath = Join-Path $Root 'data/questions.json'
$questions = Get-Content -Raw -Encoding UTF8 -LiteralPath $questionsPath | ConvertFrom-Json
foreach ($question in $questions) {
  if ($question.id -eq '2014_center_main_physics1_a21') {
    $question.image_path = $outputRel
    $question.image_paths = @($outputRel)
    $question.problem_text_status = 'manual-question-crop'
    $question.problem_text_source = 'manual pdfium crop'
  }
}
$questions | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $questionsPath

$cropsPath = Join-Path $Root 'data/image-crops.json'
$crops = @(Get-Content -Raw -Encoding UTF8 -LiteralPath $cropsPath | ConvertFrom-Json)
$next = @($crops | Where-Object { $_.question_id -ne '2014_center_main_physics1_a21' })
$next += [pscustomobject]@{
  question_id = '2014_center_main_physics1_a21'
  source_pdf = $pdfRel
  page = 24
  pdf_page = 26
  box = [pscustomobject]@{ x = 0.055; y = 0.035; width = 0.89; height = 0.208889 }
  output = $outputRel
  label = ''
  status = 'manual-question-crop'
  note = 'Trimmed to end before 問7 on the same page.'
}
$next | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $cropsPath

Write-Output $outputRel
