@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required to run this source package of Dota Map.
  echo.
  echo If you do not want to install Node.js, download the EXE package instead:
  echo DotaMap-Windows-EXE-No-Node-Required.zip
  echo.
  echo Latest release:
  echo https://github.com/abcdexyz64/dota-map/releases/latest
  pause
  exit /b 1
)
node src\server.js
