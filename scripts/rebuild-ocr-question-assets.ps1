param(
  [switch]$AnalyzeOnly,
  [string]$OnlyPdf = '',
  [int]$Limit = 0
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$QuestionsPath = Join-Path $Root 'data\questions.json'
$PdfiumRoot = 'C:\Program Files\NeeLaboratory\NeeView\Libraries'
$TempDir = Join-Path $Root 'data\_tmp\windows-ocr-pages'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ManifestPath = Join-Path $Root "worklogs\ocr-question-assets-$Stamp.json"

$QuestionChar = [string][char]0x554F
$DaiChar = [string][char]0x7B2C

$SkipGroupKeysByPdf = @{
  'data/pdf/2016_center_main_physics_basic.pdf' = @('1||2')
  'data/pdf/2015_center_main_physics.pdf' = @('4|A|1')
  'data/pdf/2014_center_main_physics1.pdf' = @('4|C|6')
  'data/pdf/2012_center_main_physics1.pdf' = @('3|B|4')
  'data/pdf/2011_center_main_physics1.pdf' = @('1||2')
  'data/pdf/2006_center_main_physics1.pdf' = @('3|A|1')
}

$DropMarkerIndicesByPdf = @{
  'data/pdf/2018_center_main_physics.pdf' = @(16)
}

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

function Get-PrimaryQuestionNo([string]$MinorNo) {
  $norm = ([string]$MinorNo).Normalize([Text.NormalizationForm]::FormKC)
  $match = [regex]::Match($norm, [regex]::Escape($QuestionChar) + '\s*([0-9]+)')
  if ($match.Success) { return $match.Groups[1].Value }
  return ''
}

function Get-FirstNumber([string]$Value) {
  $match = [regex]::Match(([string]$Value).Normalize([Text.NormalizationForm]::FormKC), '[0-9]+')
  if ($match.Success) { return [int]$match.Value }
  return $null
}

function Normalize-OcrText([string]$Text) {
  return ([string]$Text).Normalize([Text.NormalizationForm]::FormKC)
}

function Compact-OcrText([string]$Text) {
  $value = Normalize-OcrText $Text
  $value = $value -replace '\s+', ''
  return $value
}

function Clean-ProblemText([string]$Text) {
  $value = Normalize-OcrText $Text
  $value = $value -replace '[^\S\r\n]+', ' '
  $value = $value -replace "`r", "`n"
  $value = $value -replace "`n{3,}", "`n`n"
  $value = $value -replace '―\s*\d+\s*―', ' '
  $value = $value -replace '\([0-9]+[\-―][0-9]+\)', ' '
  $value = $value -replace '\s+', ' '
  return $value.Trim()
}

function Save-Jpeg($Bitmap, [string]$Path, [long]$Quality) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
  $Bitmap.Save($Path, $codec, $params)
  $params.Dispose()
}

function Render-PageImage($Pdf, [string]$PdfKey, [int]$Page, [int]$WidthPx) {
  $safePdf = $PdfKey -replace '[^a-zA-Z0-9_-]', '_'
  $imagePath = Join-Path $TempDir "$safePdf-page-$Page.png"
  if (Test-Path -LiteralPath $imagePath) { return $imagePath }
  $pageIndex = $Page - 1
  $pageSize = $Pdf.PageSizes[$pageIndex]
  $heightPx = [int][Math]::Round($WidthPx * $pageSize.Height / $pageSize.Width)
  $bitmap = $Pdf.Render($pageIndex, $WidthPx, $heightPx, 200.0, 200.0, $true)
  $bitmap.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  return $imagePath
}

function Invoke-Ocr($Engine, [string]$ImagePath) {
  $storageFile = Await ([Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime])
  $stream = Await ($storageFile.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime])
  $softwareBitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics, ContentType=WindowsRuntime])
  return Await ($Engine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType=WindowsRuntime])
}

function Get-OcrPages($Pdf, [string]$PdfPathRel, $Engine) {
  $pages = New-Object System.Collections.Generic.List[object]
  for ($page = 1; $page -le $Pdf.PageCount; $page++) {
    $imagePath = Render-PageImage $Pdf $PdfPathRel $page 2200
    $result = Invoke-Ocr $Engine $imagePath
    $lineItems = New-Object System.Collections.Generic.List[object]
    $markers = New-Object System.Collections.Generic.List[object]
    $lineIndex = 0
    foreach ($line in $result.Lines) {
      $words = @($line.Words)
      if (-not $words.Count) { continue }
      $lineText = (($words | ForEach-Object { $_.Text }) -join ' ')
      $compact = Compact-OcrText $lineText
      $firstRect = $words[0].BoundingRect
      $lineItems.Add([pscustomobject]@{
        index = $lineIndex
        text = $lineText
        compact = $compact
        x = [double]$firstRect.X
        y = [double]$firstRect.Y
      })
      if ($compact -match '^問([0-9]+)' -and $firstRect.X -lt 620) {
        $no = $Matches[1]
        $markers.Add([pscustomobject]@{
          page = $page
          line_index = $lineIndex
          no = $no
          x = [Math]::Round([double]$firstRect.X, 2)
          y_px = [Math]::Round([double]$firstRect.Y, 2)
          text = $lineText
        })
      }
      $lineIndex += 1
    }
    $pages.Add([pscustomobject]@{
      page = $page
      image_path = $imagePath
      text = $result.Text
      compact = Compact-OcrText $result.Text
      lines = @($lineItems.ToArray())
      markers = @($markers.ToArray())
    })
  }
  return $pages.ToArray()
}

function New-QuestionGroups($Records) {
  $groups = New-Object System.Collections.Generic.List[object]
  foreach ($record in $Records) {
    $primaryNo = Get-PrimaryQuestionNo ([string]$record.minor_no)
    if (-not $primaryNo) { continue }
    $key = "$($record.major_no)|$($record.middle_no)|$primaryNo"
    $last = if ($groups.Count) { $groups[$groups.Count - 1] } else { $null }
    if ($null -eq $last -or $last.key -ne $key) {
      $majorNo = Get-FirstNumber ([string]$record.major_no)
      if ($null -eq $majorNo) { $majorNo = 0 }
      $groups.Add([pscustomobject]@{
        key = $key
        major_no = [int]$majorNo
        middle_no = [string]$record.middle_no
        primary_no = [string]$primaryNo
        first_page = [string]$record.page
        ids = New-Object System.Collections.Generic.List[string]
      })
    }
    $groups[$groups.Count - 1].ids.Add([string]$record.id)
  }
  return $groups
}

function Find-HeaderPage($OcrPages, [int]$MajorNo, [int]$BeforePage) {
  $pattern = '^' + [regex]::Escape($DaiChar) + $MajorNo + [regex]::Escape($QuestionChar)
  for ($page = [Math]::Max(1, $BeforePage - 4); $page -le $BeforePage; $page++) {
    $ocrPage = $OcrPages[$page - 1]
    foreach ($line in $ocrPage.lines) {
      if ($line.compact -match $pattern) { return $page }
    }
  }
  return $BeforePage
}

function Get-TextSlice($OcrPages, $Marker, $NextMarker) {
  $texts = New-Object System.Collections.Generic.List[string]
  for ($page = $Marker.page; $page -le $(if ($NextMarker) { $NextMarker.page } else { $OcrPages.Count }); $page++) {
    $ocrPage = $OcrPages[$page - 1]
    $start = if ($page -eq $Marker.page) { $Marker.line_index } else { 0 }
    $end = $ocrPage.lines.Count - 1
    if ($NextMarker -and $page -eq $NextMarker.page) { $end = $NextMarker.line_index - 1 }
    if ($end -ge $start) {
      $texts.Add((@($ocrPage.lines | Where-Object { $_.index -ge $start -and $_.index -le $end } | ForEach-Object { $_.text }) -join "`n"))
    }
  }
  return Clean-ProblemText (($texts.ToArray()) -join "`n")
}

function Render-Crop($Pdf, [int]$Page, [double]$TopRatio, [double]$BottomRatio, [string]$OutputPath) {
  $pageIndex = $Page - 1
  $pageSize = $Pdf.PageSizes[$pageIndex]
  $widthPx = 1600
  $heightPx = [int][Math]::Round($widthPx * $pageSize.Height / $pageSize.Width)
  $image = $Pdf.Render($pageIndex, $widthPx, $heightPx, 144.0, 144.0, $true)
  $x = [int][Math]::Round(0.055 * $image.Width)
  $w = [int][Math]::Round(0.89 * $image.Width)
  $y = [int][Math]::Max(0, [Math]::Round($TopRatio * $image.Height))
  $bottom = [int][Math]::Min($image.Height, [Math]::Round($BottomRatio * $image.Height))
  $h = [Math]::Max(1, $bottom - $y)
  $rect = New-Object System.Drawing.Rectangle($x, $y, [Math]::Min($w, $image.Width - $x), $h)
  $crop = $image.Clone($rect, $image.PixelFormat)
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  Save-Jpeg $crop $OutputPath 72
  $crop.Dispose()
  $image.Dispose()
}

function Process-PdfGroup($PdfPathRel, $Records, $Engine) {
  $pdfPath = Join-Path $Root $PdfPathRel
  $groups = New-QuestionGroups $Records
  $document = [PdfiumViewer.PdfDocument]::Load($pdfPath)
  try {
    $ocrPages = Get-OcrPages $document $PdfPathRel $Engine
    $markers = @($ocrPages | ForEach-Object { $_.markers } | ForEach-Object { $_ })
    $adjustments = New-Object System.Collections.Generic.List[string]
    if ($SkipGroupKeysByPdf.ContainsKey($PdfPathRel)) {
      $skipKeys = @($SkipGroupKeysByPdf[$PdfPathRel])
      $groups = @($groups | Where-Object { $skipKeys -notcontains $_.key })
      $adjustments.Add("skip-groups:$($skipKeys -join ',')")
    }
    if ($DropMarkerIndicesByPdf.ContainsKey($PdfPathRel)) {
      $dropIndices = @($DropMarkerIndicesByPdf[$PdfPathRel])
      $filteredMarkers = New-Object System.Collections.Generic.List[object]
      for ($markerIndex = 0; $markerIndex -lt $markers.Count; $markerIndex++) {
        if ($dropIndices -notcontains $markerIndex) {
          $filteredMarkers.Add($markers[$markerIndex])
        }
      }
      $markers = @($filteredMarkers.ToArray())
      $adjustments.Add("drop-markers:$($dropIndices -join ',')")
    }
    $sequenceMatches = $true
    if ($markers.Count -eq $groups.Count) {
      for ($i = 0; $i -lt $groups.Count; $i++) {
        if ([string]$markers[$i].no -ne [string]$groups[$i].primary_no) {
          $sequenceMatches = $false
          break
        }
      }
    }
    $status = 'marker-count-mismatch'
    if ($markers.Count -eq $groups.Count) {
      $status = if ($sequenceMatches) { 'ok' } else { 'marker-sequence-mismatch' }
    }
    $report = [pscustomobject]@{
      pdf_path = $PdfPathRel
      status = $status
      pdf_pages = $document.PageCount
      groups = $groups.Count
      markers = $markers.Count
      records = $Records.Count
      adjustments = @($adjustments.ToArray())
      marker_sequence = @($markers | ForEach-Object { "$($_.page):$($_.no)" })
      group_sequence = @($groups | ForEach-Object { "$($_.key):$($_.ids[0])" })
    }
    if ($AnalyzeOnly -or $status -ne 'ok') {
      return [pscustomobject]@{ report = $report; records = @() }
    }

    $recordsOut = @()
    for ($i = 0; $i -lt $groups.Count; $i++) {
      $group = $groups[$i]
      $marker = $markers[$i]
      $prev = if ($i -gt 0) { $groups[$i - 1] } else { $null }
      $next = if ($i + 1 -lt $groups.Count) { $groups[$i + 1] } else { $null }
      $nextMarker = if ($i + 1 -lt $markers.Count) { $markers[$i + 1] } else { $null }
      $sameContextAsPrev = $prev -and $prev.major_no -eq $group.major_no -and $prev.middle_no -eq $group.middle_no
      $sameContextAsNext = $next -and $next.major_no -eq $group.major_no -and $next.middle_no -eq $group.middle_no

      $imageStartPage = $marker.page
      $startRatioForMarkerPage = [Math]::Max(0.02, ([double]$marker.y_px - 34.0) / 2200.0 / ($document.PageSizes[$marker.page - 1].Height / $document.PageSizes[$marker.page - 1].Width))
      if (-not $sameContextAsPrev -and $group.major_no -gt 0) {
        $imageStartPage = Find-HeaderPage $ocrPages $group.major_no $marker.page
        $startRatioForMarkerPage = if ($imageStartPage -eq $marker.page) { 0.04 } else { $startRatioForMarkerPage }
      }

      $lastPage = if ($nextMarker -and $sameContextAsNext) { $nextMarker.page } else { if ($nextMarker) { [Math]::Max($marker.page, $nextMarker.page - 1) } else { $document.PageCount } }
      $segments = New-Object System.Collections.Generic.List[object]
      for ($page = $imageStartPage; $page -le $lastPage; $page++) {
        $top = 0.04
        $bottom = 0.95
        if ($page -eq $marker.page -and $imageStartPage -eq $marker.page) { $top = $startRatioForMarkerPage }
        if ($nextMarker -and $sameContextAsNext -and $page -eq $nextMarker.page) {
          $pageRatioDenom = 2200.0 * ($document.PageSizes[$page - 1].Height / $document.PageSizes[$page - 1].Width)
          $bottom = [Math]::Max($top, ([double]$nextMarker.y_px - 20.0) / $pageRatioDenom)
        }
        if (($bottom - $top) -ge 0.05) {
          $segments.Add([pscustomobject]@{ page = $page; top = $top; bottom = $bottom })
        }
      }

      $text = Get-TextSlice $ocrPages $marker $nextMarker
      $firstDisplayPage = Get-FirstNumber $group.first_page
      $displayOffset = if ($null -ne $firstDisplayPage -and $segments.Count -gt 0) { $firstDisplayPage - $segments[0].page } else { 0 }

      foreach ($id in $group.ids) {
        $outputs = New-Object System.Collections.Generic.List[string]
        $cropRows = New-Object System.Collections.Generic.List[object]
        for ($part = 0; $part -lt $segments.Count; $part++) {
          $segment = $segments[$part]
          $suffix = if ($segments.Count -eq 1) { '' } else { "_p$($part + 1)" }
          $outRel = "data/images/questions/$id$suffix.jpg"
          $outAbs = Join-Path $Root $outRel
          Render-Crop $document $segment.page $segment.top $segment.bottom $outAbs
          $outputs.Add($outRel)
          $cropRows.Add([pscustomobject]@{
            question_id = $id
            source_pdf = $PdfPathRel
            page = $segment.page + $displayOffset
            pdf_page = $segment.page
            box = [pscustomobject]@{ x = 0.055; y = [Math]::Round($segment.top, 6); width = 0.89; height = [Math]::Round($segment.bottom - $segment.top, 6) }
            output = $outRel
            label = if ($segments.Count -eq 1) { '' } else { "$($part + 1)/$($segments.Count)" }
            status = 'windows-ocr-question-marker-bounded'
            note = 'Cropped from Windows OCR question marker detection.'
          })
        }
        $recordsOut += [pscustomobject]@{
          id = $id
          pdf_path = $PdfPathRel
          group_key = $group.key
          marker_no = $marker.no
          image_paths = @($outputs.ToArray())
          masked_problem_text = $text
          crop_rows = @($cropRows.ToArray())
        }
      }
    }
    return [pscustomobject]@{ report = $report; records = @($recordsOut) }
  }
  finally {
    $document.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
$lang = [Windows.Globalization.Language, Windows.Foundation, ContentType=WindowsRuntime]::new('ja')
$engine = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]::TryCreateFromLanguage($lang)
if ($null -eq $engine) { throw 'Windows OCR Japanese engine is unavailable.' }

$questions = Get-Content -Raw -Encoding UTF8 -LiteralPath $QuestionsPath | ConvertFrom-Json
$groupsByPdf = [ordered]@{}
foreach ($question in $questions) {
  $pdfPath = [string]$question.pdf_path
  if (-not $pdfPath.StartsWith('data/pdf/')) { continue }
  if ($OnlyPdf -and $pdfPath -ne $OnlyPdf) { continue }
  if ($question.problem_text_status -eq 'pdfium-question-marker-slice') { continue }
  $fullPdf = Join-Path $Root $pdfPath
  if (-not (Test-Path -LiteralPath $fullPdf)) { continue }
  if (-not $groupsByPdf.Contains($pdfPath)) {
    $groupsByPdf[$pdfPath] = New-Object System.Collections.Generic.List[object]
  }
  $groupsByPdf[$pdfPath].Add($question)
}

$reports = New-Object System.Collections.Generic.List[object]
$records = New-Object System.Collections.Generic.List[object]
$processed = 0
foreach ($pdfPath in $groupsByPdf.Keys) {
  if ($Limit -gt 0 -and $processed -ge $Limit) { break }
  $processed += 1
  Write-Output "processing=$pdfPath"
  try {
    $result = Process-PdfGroup $pdfPath @($groupsByPdf[$pdfPath].ToArray()) $engine
    $reports.Add($result.report)
    foreach ($record in $result.records) { $records.Add($record) }
    Write-Output "status=$($result.report.status) groups=$($result.report.groups) markers=$($result.report.markers)"
  } catch {
    $reports.Add([pscustomobject]@{ pdf_path = $pdfPath; status = 'error'; error = $_.Exception.Message; records = $groupsByPdf[$pdfPath].Count })
    Write-Output "status=error error=$($_.Exception.Message)"
  }
}

$manifest = [pscustomobject]@{
  created_at = (Get-Date).ToString('o')
  analyze_only = [bool]$AnalyzeOnly
  records = @($records.ToArray())
  reports = @($reports.ToArray())
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ManifestPath) | Out-Null
$manifest | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $ManifestPath
$okCount = @($reports | Where-Object { $_.status -eq 'ok' }).Count
$mismatchCount = @($reports | Where-Object { $_.status -match 'mismatch' }).Count
$errorCount = @($reports | Where-Object { $_.status -eq 'error' }).Count
Write-Output "manifest=$ManifestPath"
Write-Output "processed_pdfs=$processed"
Write-Output "ok_pdfs=$okCount"
Write-Output "mismatch_pdfs=$mismatchCount"
Write-Output "error_pdfs=$errorCount"
Write-Output "records=$($records.Count)"
