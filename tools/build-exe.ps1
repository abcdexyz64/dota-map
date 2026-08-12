param(
  [string]$Version = "0.3.3"
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$root = Split-Path -Parent $PSScriptRoot
$exeDir = Join-Path $root "dist\exe"
$seaDir = Join-Path $root "dist\sea"
$bundlePath = Join-Path $seaDir "server.bundle.cjs"
$seaConfigPath = Join-Path $seaDir "sea-config.json"
$blobPath = Join-Path $seaDir "dota-map.blob"
$exePath = Join-Path $exeDir "DotaMap.exe"
$zipPath = Join-Path $root "dist\DotaMap-Windows-EXE-No-Node-Required-$Version.zip"
$iconPath = Join-Path $root "assets\dota2map.ico"

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath exited with code $LASTEXITCODE"
  }
}

New-Item -ItemType Directory -Force -Path $exeDir, $seaDir | Out-Null
Get-ChildItem -LiteralPath $exeDir -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Remove-Item -LiteralPath $exePath, $zipPath, $bundlePath, $seaConfigPath, $blobPath -Force -ErrorAction SilentlyContinue

Invoke-Checked "npx" @(
  "--yes",
  "esbuild@0.23.1",
  (Join-Path $root "src\server.js"),
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--outfile=$bundlePath"
)

$assets = [ordered]@{}
foreach ($dir in @("public", "assets")) {
  Get-ChildItem -LiteralPath (Join-Path $root $dir) -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($root.Length).TrimStart("\", "/").Replace("\", "/")
    $assets[$relative] = $_.FullName
  }
}

$seaConfig = [ordered]@{
  main = $bundlePath
  output = $blobPath
  disableExperimentalSEAWarning = $true
  useCodeCache = $false
  assets = $assets
}
[System.IO.File]::WriteAllText($seaConfigPath, ($seaConfig | ConvertTo-Json -Depth 8), $utf8NoBom)

Invoke-Checked "node" @("--experimental-sea-config", $seaConfigPath)

$nodePath = (Get-Command node.exe).Source
Copy-Item -LiteralPath $nodePath -Destination $exePath -Force

Invoke-Checked "npx" @(
  "--yes",
  "postject@1.0.0-alpha.6",
  $exePath,
  "NODE_SEA_BLOB",
  $blobPath,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  "--overwrite"
)

$readme = Join-Path $exeDir "README-EXE.txt"
$text = @"
Dota Map EXE package

Double-click DotaMap.exe to start the local app.
The app opens a browser at the local URL it selects.
Node.js is already embedded in this EXE package. Users do not need to install Node.js.

This package does not include Dota 2 map files.
"@
Set-Content -LiteralPath $readme -Value $text -Encoding UTF8
Copy-Item -LiteralPath $iconPath -Destination (Join-Path $exeDir "dota2map.ico") -Force

Get-ChildItem -LiteralPath $exeDir -Recurse -File |
  Where-Object { $_.Extension -eq ".vpk" -or $_.Name -like "*.log" } |
  ForEach-Object { throw "Unexpected file in EXE package: $($_.FullName)" }

Compress-Archive -Path (Join-Path $exeDir "*") -DestinationPath $zipPath -Force

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
[PSCustomObject]@{
  Exe = $exePath
  Zip = $zipPath
  Sha256 = $hash.Hash
  Version = $Version
} | ConvertTo-Json
