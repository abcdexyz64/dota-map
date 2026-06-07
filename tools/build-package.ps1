param(
  [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$stageRoot = Join-Path $dist "stage"
$stage = Join-Path $stageRoot "DotaMap"
$zip = Join-Path $dist "dota-map-windows-$Version.zip"
$assets = Join-Path $root "assets"

function New-DotaMapIcon {
  param(
    [string]$PngPath,
    [string]$IcoPath
  )

  Add-Type -AssemblyName System.Drawing
  $size = 512
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $black = [System.Drawing.Color]::FromArgb(255, 5, 5, 5)
  $panel = [System.Drawing.Color]::FromArgb(255, 15, 15, 15)
  $orange = [System.Drawing.Color]::FromArgb(255, 255, 153, 0)

  $graphics.Clear($black)
  $orangePen = New-Object System.Drawing.Pen $orange, 18
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $panel), 72, 94, 368, 324)
  $graphics.DrawRectangle($orangePen, 72, 94, 368, 324)
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $orange), 104, 136, 128, 244)
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $orange), 252, 136, 148, 70)
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $orange), 252, 226, 148, 60)
  $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $orange), 252, 310, 148, 70)

  $fontD = New-Object System.Drawing.Font "Segoe UI Black", 142, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $font2 = New-Object System.Drawing.Font "Segoe UI Black", 78, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fontM = New-Object System.Drawing.Font "Segoe UI Black", 50, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fontSmall = New-Object System.Drawing.Font "Segoe UI Black", 30, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)

  $graphics.DrawString("D", $fontD, (New-Object System.Drawing.SolidBrush $black), 112, 166)
  $graphics.DrawString("2", $font2, (New-Object System.Drawing.SolidBrush $black), 274, 132)
  $graphics.DrawString("MAP", $fontM, (New-Object System.Drawing.SolidBrush $black), 266, 231)
  $graphics.DrawString("dota2map", $fontSmall, (New-Object System.Drawing.SolidBrush $black), 257, 330)

  $bitmap.Save($PngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
  $stream = [System.IO.File]::Create($IcoPath)
  try {
    $icon.Save($stream)
  } finally {
    $stream.Dispose()
    $icon.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $dist, $assets | Out-Null
New-DotaMapIcon -PngPath (Join-Path $assets "dota2map.png") -IcoPath (Join-Path $assets "dota2map.ico")

if (Test-Path -LiteralPath $stageRoot) {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$files = @(
  "DotaMap.cmd",
  "LICENSE",
  "README.md",
  "package.json"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $stage $file)
}

foreach ($dir in @("assets", "public", "src")) {
  Copy-Item -LiteralPath (Join-Path $root $dir) -Destination (Join-Path $stage $dir) -Recurse
}

$quickStart = @"
Dota Map quick start

1. Install Node.js 18 or newer if it is not already installed.
2. Double-click DotaMap.cmd.
3. The app opens in your browser.
4. Use Dry run before switching maps.

This package does not include Dota 2 map files.
"@
Set-Content -LiteralPath (Join-Path $stage "QUICK_START.txt") -Value $quickStart -Encoding UTF8

Get-ChildItem -LiteralPath $stage -Recurse -File |
  Where-Object { $_.Extension -eq ".vpk" -or $_.Name -like "*.log" } |
  ForEach-Object { throw "Unexpected file in package: $($_.FullName)" }

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force

$hash = Get-FileHash -LiteralPath $zip -Algorithm SHA256
[PSCustomObject]@{
  Zip = $zip
  Sha256 = $hash.Hash
  Version = $Version
} | ConvertTo-Json
