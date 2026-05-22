param(
  [switch]$AnalyzeOnly,
  [switch]$Include2025MainPhysics,
  [string]$OnlyPdf = '',
  [int]$Limit = 0
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$QuestionsPath = Join-Path $Root 'data\questions.json'
$PdfiumRoot = 'C:\Program Files\NeeLaboratory\NeeView\Libraries'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ManifestPath = Join-Path $Root "worklogs\pdfium-question-assets-$Stamp.json"

$QuestionChar = [string][char]0x554F
$DaiChar = [string][char]0x7B2C

$SkipGroupKeysByPdf = @{
  'data/pdf/2025_common_makeup_physics.pdf' = @('2||5')
  'data/pdf/2024_common_makeup_physics_basic.pdf' = @('2||6', '3||6')
  'data/pdf/2023_common_makeup_physics.pdf' = @('2||4', '2||5', '4||6')
}

$DropMarkerIndicesByPdf = @{
  'data/pdf/2023_common_main_physics.pdf' = @(18)
}

$env:PATH = (Join-Path $PdfiumRoot 'x64') + ';' + $env:PATH
Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PdfiumRoot 'PdfiumViewer.dll')

function Convert-AsciiDigit([string]$Value) {
  return $Value.Normalize([Text.NormalizationForm]::FormKC)
}

function Test-DigitChar([string]$Value) {
  return (Convert-AsciiDigit $Value) -match '^[0-9]$'
}

function Get-PdfChar($Pdf, [int]$PageIndex, [int]$Offset) {
  try {
    return $Pdf.GetPdfText((New-Object PdfiumViewer.PdfTextSpan($PageIndex, $Offset, 1)))
  } catch {
    return ''
  }
}

function Get-QuestionNoNear($Pdf, [int]$PageIndex, [int]$Offset, [int]$MaxOffset) {
  for ($j = $Offset + 1; $j -lt [Math]::Min($Offset + 8, $MaxOffset); $j++) {
    $char = Get-PdfChar $Pdf $PageIndex $j
    if ([string]::IsNullOrWhiteSpace($char)) { continue }
    if (Test-DigitChar $char) { return (Convert-AsciiDigit $char) }
    return ''
  }
  return ''
}

function Get-QuestionMarkers($Pdf, [string[]]$PageTexts) {
  $markers = New-Object System.Collections.Generic.List[object]
  $seen = @{}
  $markerPattern = [regex]::Escape($QuestionChar) + '\s*[0-9]+'
  for ($pageIndex = 0; $pageIndex -lt $Pdf.PageCount; $pageIndex++) {
    $text = $PageTexts[$pageIndex]
    if ([string]::IsNullOrWhiteSpace($text)) { continue }
    $normText = $text.Normalize([Text.NormalizationForm]::FormKC)
    $maxOffset = $text.Length + 40
    foreach ($match in [regex]::Matches($normText, $markerPattern)) {
      for ($offset = [Math]::Max(0, $match.Index - 20); $offset -lt [Math]::Min($maxOffset, $match.Index + 40); $offset++) {
        if ((Get-PdfChar $Pdf $pageIndex $offset) -ne $QuestionChar) { continue }
        $span = New-Object PdfiumViewer.PdfTextSpan($pageIndex, $offset, 1)
        $bounds = $Pdf.GetTextBounds($span)
        if ($bounds.Count -eq 0) { continue }
        $x = $bounds[0].Bounds.X
        $y = $bounds[0].Bounds.Y
        if ($x -ge 105) { continue }
        $no = Get-QuestionNoNear $Pdf $pageIndex $offset $maxOffset
        if (-not $no) { continue }
        $key = "$pageIndex/$offset"
        if ($seen.ContainsKey($key)) { break }
        $seen[$key] = $true
        $markers.Add([pscustomobject]@{
          page = $pageIndex + 1
          page_index = $pageIndex
          full_index = $match.Index
          offset = $offset
          no = $no
          x = [Math]::Round($x, 3)
          y_pdf = [Math]::Round($y, 3)
          top_pt = [Math]::Round($Pdf.PageSizes[$pageIndex].Height - $y, 3)
        })
        break
      }
    }
  }
  return $markers.ToArray()
}

function Get-PrimaryQuestionNo([string]$MinorNo) {
  $norm = ([string]$MinorNo).Normalize([Text.NormalizationForm]::FormKC)
  $pattern = [regex]::Escape($QuestionChar) + '\s*([0-9]+)'
  $match = [regex]::Match($norm, $pattern)
  if ($match.Success) { return $match.Groups[1].Value }
  return ''
}

function Get-FirstNumber([string]$Value) {
  $match = [regex]::Match(([string]$Value).Normalize([Text.NormalizationForm]::FormKC), '[0-9]+')
  if ($match.Success) { return [int]$match.Value }
  return $null
}

function Find-MajorHeaderPage([string[]]$PageTexts, [int]$MajorNo, [int]$BeforePage) {
  $pattern = [regex]::Escape($DaiChar) + '\s*' + $MajorNo + '\s*' + [regex]::Escape($QuestionChar)
  for ($page = [Math]::Max(1, $BeforePage - 4); $page -le $BeforePage; $page++) {
    $normText = $PageTexts[$page - 1].Normalize([Text.NormalizationForm]::FormKC)
    if ($normText -match $pattern) { return $page }
  }
  return $BeforePage
}

function Clean-ProblemText([string]$Text) {
  $value = $Text.Normalize([Text.NormalizationForm]::FormKC)
  $value = $value -replace "`0+", ' '
  $value = $value -replace '[^\S\r\n]+', ' '
  $value = $value -replace "`r", "`n"
  $value = $value -replace "`n{3,}", "`n`n"
  $value = $value -replace '―\s*\d+\s*―', ' '
  $value = $value -replace '\([0-9]+[\-―][0-9]+\)', ' '
  $value = $value -replace '\s+', ' '
  return $value.Trim()
}

function Trim-ToQuestionMarker([string]$Text, [string]$No) {
  $pattern = [regex]::Escape($QuestionChar) + '\s*' + [regex]::Escape($No) + '(?!\s*[\-~〜])'
  $match = [regex]::Match($Text, $pattern)
  if ($match.Success) {
    return $Text.Substring($match.Index).Trim()
  }
  return $Text
}

function Save-Jpeg($Bitmap, [string]$Path, [long]$Quality) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
  $Bitmap.Save($Path, $codec, $params)
  $params.Dispose()
}

function Render-Crop($Pdf, [int]$Page, [double]$TopPt, [double]$BottomPt, [string]$OutputPath) {
  $pageIndex = $Page - 1
  $pageSize = $Pdf.PageSizes[$pageIndex]
  $widthPx = 1600
  $heightPx = [int][Math]::Round($widthPx * $pageSize.Height / $pageSize.Width)
  $image = $Pdf.Render($pageIndex, $widthPx, $heightPx, 144.0, 144.0, $true)
  $x = [int][Math]::Round(0.055 * $image.Width)
  $w = [int][Math]::Round(0.89 * $image.Width)
  $y = [int][Math]::Max(0, [Math]::Round($TopPt / $pageSize.Height * $image.Height))
  $bottom = [int][Math]::Min($image.Height, [Math]::Round($BottomPt / $pageSize.Height * $image.Height))
  $h = [Math]::Max(1, $bottom - $y)
  $rect = New-Object System.Drawing.Rectangle($x, $y, [Math]::Min($w, $image.Width - $x), $h)
  $crop = $image.Clone($rect, $image.PixelFormat)
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
  Save-Jpeg $crop $OutputPath 72
  $result = [pscustomobject]@{
    page = $Page
    top_pt = [Math]::Round($TopPt, 3)
    bottom_pt = [Math]::Round($BottomPt, 3)
    output = $OutputPath.Substring($Root.Length + 1).Replace('\', '/')
    width = $crop.Width
    height = $crop.Height
    bytes = (Get-Item -LiteralPath $OutputPath).Length
  }
  $crop.Dispose()
  $image.Dispose()
  return $result
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

function Process-PdfGroup($PdfPathRel, $Records) {
  $pdfPath = Join-Path $Root $PdfPathRel
  $groups = New-QuestionGroups $Records
  $pdf = [PdfiumViewer.PdfDocument]::Load($pdfPath)
  try {
    $pageTexts = for ($pageIndex = 0; $pageIndex -lt $pdf.PageCount; $pageIndex++) { $pdf.GetPdfText($pageIndex) }
    $pageStarts = New-Object int[] $pdf.PageCount
    $docTextBuilder = New-Object System.Text.StringBuilder
    for ($pageIndex = 0; $pageIndex -lt $pdf.PageCount; $pageIndex++) {
      $pageStarts[$pageIndex] = $docTextBuilder.Length
      [void]$docTextBuilder.Append($pageTexts[$pageIndex])
      [void]$docTextBuilder.Append("`n`n")
    }
    $normDocText = $docTextBuilder.ToString().Normalize([Text.NormalizationForm]::FormKC)
    $markers = Get-QuestionMarkers $pdf $pageTexts
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
      for ($sequenceIndex = 0; $sequenceIndex -lt $groups.Count; $sequenceIndex++) {
        if ([string]$markers[$sequenceIndex].no -ne [string]$groups[$sequenceIndex].primary_no) {
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
      pdf_pages = $pdf.PageCount
      groups = $groups.Count
      markers = $markers.Count
      records = $Records.Count
      adjustments = @($adjustments.ToArray())
      samples = @($markers | Select-Object -First 8)
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
      $startAtMarker = $true
      if (-not $sameContextAsPrev) {
        if ($prev -and $prev.major_no -ne $group.major_no -and $group.major_no -gt 0) {
          $imageStartPage = Find-MajorHeaderPage $pageTexts $group.major_no $marker.page
        }
        $startAtMarker = $false
      }

      $nextContextStartPage = $null
      if ($next) {
        if ($next.major_no -ne $group.major_no -and $next.major_no -gt 0) {
          $nextContextStartPage = Find-MajorHeaderPage $pageTexts $next.major_no $nextMarker.page
        } elseif ($next.middle_no -ne $group.middle_no) {
          $nextContextStartPage = $nextMarker.page
        }
      }

      $textStart = $pageStarts[$marker.page_index] + $marker.full_index
      $textEnd = $normDocText.Length
      if ($nextMarker) {
        if ($sameContextAsNext) {
          $textEnd = $pageStarts[$nextMarker.page_index] + $nextMarker.full_index
        } elseif ($nextContextStartPage) {
          $textEnd = $pageStarts[$nextContextStartPage - 1]
        }
      }
      $text = Clean-ProblemText $normDocText.Substring($textStart, [Math]::Max(0, $textEnd - $textStart))
      $text = Trim-ToQuestionMarker $text $marker.no

      $segments = New-Object System.Collections.Generic.List[object]
      $lastPage = if ($nextMarker -and $sameContextAsNext) { $nextMarker.page } elseif ($nextContextStartPage) { $nextContextStartPage - 1 } else { $pdf.PageCount }
      for ($page = $imageStartPage; $page -le $lastPage; $page++) {
        $pageHeight = $pdf.PageSizes[$page - 1].Height
        $top = 35.0
        $bottom = $pageHeight - 35.0
        if ($page -eq $marker.page -and $startAtMarker) {
          $top = [Math]::Max(25.0, $marker.top_pt - 14.0)
        }
        if ($nextMarker -and $sameContextAsNext -and $page -eq $nextMarker.page) {
          $bottom = [Math]::Max($top, $nextMarker.top_pt - 10.0)
        }
        if (($bottom - $top) -ge 45.0) {
          $segments.Add([pscustomobject]@{ page = $page; top_pt = $top; bottom_pt = $bottom })
        }
      }

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
          [void](Render-Crop $pdf $segment.page $segment.top_pt $segment.bottom_pt $outAbs)
          $outputs.Add($outRel)
          $cropRows.Add([pscustomobject]@{
            question_id = $id
            source_pdf = $PdfPathRel
            page = $segment.page + $displayOffset
            pdf_page = $segment.page
            box = [pscustomobject]@{
              x = 0.055
              y = [Math]::Round($segment.top_pt / $pdf.PageSizes[$segment.page - 1].Height, 6)
              width = 0.89
              height = [Math]::Round(($segment.bottom_pt - $segment.top_pt) / $pdf.PageSizes[$segment.page - 1].Height, 6)
            }
            output = $outRel
            label = if ($segments.Count -eq 1) { '' } else { "$($part + 1)/$($segments.Count)" }
            status = 'pdfium-question-marker-bounded'
            note = 'Cropped from the detected question marker to the next question marker; shared context may be included.'
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
    $pdf.Dispose()
  }
}

$questions = Get-Content -Raw -Encoding UTF8 -LiteralPath $QuestionsPath | ConvertFrom-Json
$groupsByPdf = [ordered]@{}
foreach ($question in $questions) {
  $pdfPath = [string]$question.pdf_path
  if (-not $pdfPath.StartsWith('data/pdf/')) { continue }
  if ($OnlyPdf -and $pdfPath -ne $OnlyPdf) { continue }
  if (-not $Include2025MainPhysics -and $pdfPath -eq 'data/pdf/2025_common_main_physics.pdf') { continue }
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
    $result = Process-PdfGroup $pdfPath @($groupsByPdf[$pdfPath].ToArray())
    $reports.Add($result.report)
    foreach ($record in $result.records) { $records.Add($record) }
    Write-Output "status=$($result.report.status) groups=$($result.report.groups) markers=$($result.report.markers)"
  } catch {
    $reports.Add([pscustomobject]@{
      pdf_path = $pdfPath
      status = 'error'
      error = $_.Exception.Message
      records = $groupsByPdf[$pdfPath].Count
    })
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
$mismatchCount = @($reports | Where-Object { $_.status -eq 'marker-count-mismatch' }).Count
$errorCount = @($reports | Where-Object { $_.status -eq 'error' }).Count
Write-Output "manifest=$ManifestPath"
Write-Output "processed_pdfs=$processed"
Write-Output "ok_pdfs=$okCount"
Write-Output "mismatch_pdfs=$mismatchCount"
Write-Output "error_pdfs=$errorCount"
Write-Output "records=$($records.Count)"
