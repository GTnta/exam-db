$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PdfPath = Join-Path $Root 'data\pdf\2025_common_main_physics.pdf'
$QuestionsPath = Join-Path $Root 'data\questions.json'
$ManifestPath = Join-Path $Root 'worklogs\2025-main-physics-question-assets-manifest.json'
$PdfiumRoot = 'C:\Program Files\NeeLaboratory\NeeView\Libraries'

$QuestionChar = [string][char]0x554F
$DaiChar = [string][char]0x7B2C
$DropPagesByFirstId = @{
  '2025_common_main_physics_a13' = @(18)
  '2025_common_main_physics_a21' = @(27)
}
$PrependPagesByFirstId = @{
  '2025_common_main_physics_a14' = @(18)
  '2025_common_main_physics_a22' = @(27)
  '2025_common_main_physics_a23' = @(27)
  '2025_common_main_physics_a24' = @(27)
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
  return $Pdf.GetPdfText((New-Object PdfiumViewer.PdfTextSpan($PageIndex, $Offset, 1)))
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
  $value = $value -replace '\([0-9]+-[0-9]+\)', ' '
  $value = $value -replace '\s+', ' '
  return $value.Trim()
}

function Trim-ToQuestionMarker([string]$Text, [string]$No) {
  $pattern = [regex]::Escape($QuestionChar) + '\s*' + [regex]::Escape($No) + '(?!\s*~)'
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

$questions = Get-Content -Raw -Encoding UTF8 -LiteralPath $QuestionsPath | ConvertFrom-Json
$targetRecords = @(
  $questions |
    Where-Object { $_.id -match '^2025_common_main_physics_a[0-9]+$' } |
    Sort-Object {[int]$_.answer_no}
)

$groups = New-Object System.Collections.Generic.List[object]
foreach ($record in $targetRecords) {
  $key = "$($record.major_no)|$($record.middle_no)|$($record.minor_no)"
  $last = if ($groups.Count) { $groups[$groups.Count - 1] } else { $null }
  if ($null -eq $last -or $last.key -ne $key) {
    $groups.Add([pscustomobject]@{
      key = $key
      major_no = [int]$record.major_no
      middle_no = [string]$record.middle_no
      minor_no = [string]$record.minor_no
      first_answer_no = [int]$record.answer_no
      ids = New-Object System.Collections.Generic.List[string]
    })
  }
  $groups[$groups.Count - 1].ids.Add([string]$record.id)
}

$pdf = [PdfiumViewer.PdfDocument]::Load($PdfPath)
try {
  $pageTexts = for ($pageIndex = 0; $pageIndex -lt $pdf.PageCount; $pageIndex++) { $pdf.GetPdfText($pageIndex) }
  $pageStarts = New-Object int[] $pdf.PageCount
  $docTextBuilder = New-Object System.Text.StringBuilder
  for ($pageIndex = 0; $pageIndex -lt $pdf.PageCount; $pageIndex++) {
    $pageStarts[$pageIndex] = $docTextBuilder.Length
    [void]$docTextBuilder.Append($pageTexts[$pageIndex])
    [void]$docTextBuilder.Append("`n`n")
  }
  $docText = $docTextBuilder.ToString()
  $normDocText = $docText.Normalize([Text.NormalizationForm]::FormKC)
  $markers = Get-QuestionMarkers $pdf $pageTexts
  if ($markers.Count -ne $groups.Count) {
    throw "Question marker count mismatch: markers=$($markers.Count) groups=$($groups.Count)"
  }

  $groupInfos = @()
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
      if ($prev -and $prev.major_no -ne $group.major_no) {
        $imageStartPage = Find-MajorHeaderPage $pageTexts $group.major_no $marker.page
      }
      $startAtMarker = $false
    }

    $nextContextStartPage = $null
    if ($next) {
      if ($next.major_no -ne $group.major_no) {
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
      } else {
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

    $firstId = $group.ids[0]
    if ($DropPagesByFirstId.ContainsKey($firstId)) {
      $dropPages = @($DropPagesByFirstId[$firstId])
      $segments = @($segments | ForEach-Object { $_ } | Where-Object { $dropPages -notcontains $_.page })
    }
    if ($PrependPagesByFirstId.ContainsKey($firstId)) {
      $prependSegments = New-Object System.Collections.Generic.List[object]
      foreach ($prependPage in @($PrependPagesByFirstId[$firstId])) {
        $pageHeight = $pdf.PageSizes[$prependPage - 1].Height
        $prependSegments.Add([pscustomobject]@{ page = $prependPage; top_pt = 35.0; bottom_pt = $pageHeight - 35.0 })
      }
      foreach ($segment in @($segments | ForEach-Object { $_ })) { $prependSegments.Add($segment) }
      $segments = @($prependSegments.ToArray())
    }

    $groupInfos += [pscustomobject]@{
      key = $group.key
      ids = @($group.ids.ToArray())
      marker = $marker
      image_start_page = $imageStartPage
      text = $text
      segments = @($segments | ForEach-Object { $_ })
    }
  }

  $records = @()
  foreach ($info in $groupInfos) {
    foreach ($id in $info.ids) {
      $outputs = New-Object System.Collections.Generic.List[string]
      $cropRows = New-Object System.Collections.Generic.List[object]
      for ($part = 0; $part -lt $info.segments.Count; $part++) {
        $segment = $info.segments[$part]
        $suffix = if ($info.segments.Count -eq 1) { '' } else { "_p$($part + 1)" }
        $outRel = "data/images/questions/$id$suffix.jpg"
        $outAbs = Join-Path $Root $outRel
        [void](Render-Crop $pdf $segment.page $segment.top_pt $segment.bottom_pt $outAbs)
        $outputs.Add($outRel)
        $cropRows.Add([pscustomobject]@{
          question_id = $id
          source_pdf = 'data/pdf/2025_common_main_physics.pdf'
          page = $segment.page + 73
          pdf_page = $segment.page
          box = [pscustomobject]@{
            x = 0.055
            y = [Math]::Round($segment.top_pt / $pdf.PageSizes[$segment.page - 1].Height, 6)
            width = 0.89
            height = [Math]::Round(($segment.bottom_pt - $segment.top_pt) / $pdf.PageSizes[$segment.page - 1].Height, 6)
          }
          output = $outRel
          label = if ($info.segments.Count -eq 1) { '' } else { "$($part + 1)/$($info.segments.Count)" }
          status = 'question-marker-bounded'
          note = 'Cropped from the detected current question marker to the next question or section boundary.'
        })
      }
      $records += [pscustomobject]@{
        id = $id
        group_key = $info.key
        marker_no = $info.marker.no
        image_paths = @($outputs.ToArray())
        masked_problem_text = $info.text
        crop_rows = @($cropRows.ToArray())
      }
    }
  }

  $manifest = [pscustomobject]@{
    created_at = (Get-Date).ToString('o')
    source_pdf = 'data/pdf/2025_common_main_physics.pdf'
    marker_count = $markers.Count
    group_count = $groups.Count
    markers = @($markers)
    records = @($records)
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ManifestPath) | Out-Null
  $manifest | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath $ManifestPath
  Write-Output "manifest=$ManifestPath"
  Write-Output "records=$($records.Count)"
  Write-Output "markers=$($markers.Count)"
}
finally {
  $pdf.Dispose()
}
