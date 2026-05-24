param(
  [string]$OutDir = 'worklogs\bc-first-contact-after-tight'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$QuestionsPath = Join-Path $Root 'data\questions.json'
$OutPath = Join-Path $Root $OutDir
New-Item -ItemType Directory -Force -Path $OutPath | Out-Null

Add-Type -AssemblyName System.Drawing

$questions = Get-Content -Raw -Encoding UTF8 -LiteralPath $QuestionsPath | ConvertFrom-Json
$targets = @($questions | Where-Object {
  $_.middle_no -in @('B', 'C') -and $_.image_paths -and $_.image_paths.Count -gt 0
} | Sort-Object year, exam_system, session, subject, major_no, middle_no, minor_no)

foreach ($yearGroup in ($targets | Group-Object year)) {
  $items = @($yearGroup.Group)
  $cols = 4
  $tileW = 360
  $tileH = 500
  $labelH = 52
  $rows = [Math]::Ceiling($items.Count / $cols)
  $sheet = New-Object System.Drawing.Bitmap ($cols * $tileW), ($rows * ($tileH + $labelH))
  $g = [System.Drawing.Graphics]::FromImage($sheet)
  $g.Clear([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font 'Meiryo', 10
  $brush = [System.Drawing.Brushes]::Black

  for ($i = 0; $i -lt $items.Count; $i++) {
    $q = $items[$i]
    $col = $i % $cols
    $row = [Math]::Floor($i / $cols)
    $x = $col * $tileW
    $y = $row * ($tileH + $labelH)
    $rel = [string]$q.image_paths[0]
    $abs = Join-Path $Root $rel
    if (Test-Path -LiteralPath $abs) {
      try {
        $img = [System.Drawing.Image]::FromFile($abs)
        $scale = [Math]::Min(($tileW - 8) / $img.Width, ($tileH - 8) / $img.Height)
        $w = [int]($img.Width * $scale)
        $h = [int]($img.Height * $scale)
        $g.DrawImage($img, $x + [int](($tileW - $w) / 2), $y + 4, $w, $h)
        $img.Dispose()
      } catch {
        $g.DrawString("image load failed", $font, $brush, $x + 8, $y + 16)
      }
    }
    $label = "$($q.id)`n第$($q.major_no)問$($q.middle_no)$($q.minor_no) first=$([IO.Path]::GetFileName($rel))"
    $g.DrawString($label, $font, $brush, $x + 4, $y + $tileH + 4)
  }

  $outFile = Join-Path $OutPath ("bc-first-contact-{0}.jpg" -f $yearGroup.Name)
  $sheet.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $g.Dispose()
  $sheet.Dispose()
  Write-Output $outFile
}
