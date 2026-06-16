# VoltCart - Run Mobile App on Chrome
# This script runs the Flutter mobile app on Chrome browser

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VoltCart Mobile App - Chrome Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$flutterPath = "C:\src\flutter\bin\flutter"

# Check if Flutter exists
if (-Not (Test-Path $flutterPath)) {
    Write-Host "Error: Flutter not found at C:\src\flutter\bin\flutter" -ForegroundColor Red
    Write-Host "Please update the Flutter path in this script" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/3] Checking Flutter installation..." -ForegroundColor Yellow
& $flutterPath --version
Write-Host ""

Write-Host "[2/3] Installing dependencies..." -ForegroundColor Yellow
Set-Location "mobile_app"
& $flutterPath pub get

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "[3/3] Launching app on Chrome..." -ForegroundColor Yellow
Write-Host "The app will open in your default Chrome browser" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop the app" -ForegroundColor Gray
Write-Host ""

& $flutterPath run -d chrome --web-port=8080
