# VoltCart - Quick Start & Verification Script
# Run this script to verify all fixes are working correctly

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VoltCart Verification Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env files exist
Write-Host "[1/5] Checking environment files..." -ForegroundColor Yellow

$mobileEnv = Test-Path "mobile_app\.env"
$webEnv = Test-Path "web_app_react\.env"

if ($mobileEnv) {
    Write-Host "  ✓ Mobile .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ Mobile .env file NOT found" -ForegroundColor Red
    Write-Host "    → Run: copy mobile_app\.env.example mobile_app\.env" -ForegroundColor Yellow
}

if ($webEnv) {
    Write-Host "  ✓ Web .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ Web .env file NOT found" -ForegroundColor Red
    Write-Host "    → Run: copy web_app_react\.env.example web_app_react\.env" -ForegroundColor Yellow
}

Write-Host ""

# Check if .env files are in .gitignore
Write-Host "[2/5] Checking .gitignore protection..." -ForegroundColor Yellow

$gitignore = Get-Content ".gitignore" -Raw
if ($gitignore -match "\.env") {
    Write-Host "  ✓ .env files are protected in .gitignore" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env files NOT in .gitignore" -ForegroundColor Red
}

Write-Host ""

# Check package dependencies
Write-Host "[3/5] Checking mobile app dependencies..." -ForegroundColor Yellow

$pubspec = Get-Content "mobile_app\pubspec.yaml" -Raw
if ($pubspec -match "flutter_dotenv") {
    Write-Host "  ✓ flutter_dotenv package added" -ForegroundColor Green
} else {
    Write-Host "  ✗ flutter_dotenv package NOT found" -ForegroundColor Red
}

Write-Host ""

# Check test files
Write-Host "[4/5] Checking unit tests..." -ForegroundColor Yellow

$testFiles = @(
    "mobile_app\test\services\auth_service_test.dart",
    "mobile_app\test\services\cart_service_test.dart",
    "mobile_app\test\services\order_service_test.dart"
)

foreach ($testFile in $testFiles) {
    if (Test-Path $testFile) {
        $fileName = Split-Path $testFile -Leaf
        Write-Host "  ✓ $fileName" -ForegroundColor Green
    } else {
        $fileName = Split-Path $testFile -Leaf
        Write-Host "  ✗ $fileName NOT found" -ForegroundColor Red
    }
}

Write-Host ""

# Check documentation
Write-Host "[5/5] Checking documentation..." -ForegroundColor Yellow

$docs = @(
    "ENVIRONMENT_SETUP.md",
    "FIXES_APPLIED.md"
)

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "  ✓ $doc" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $doc NOT found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Verification Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Next steps
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Update your .env files with actual Supabase credentials" -ForegroundColor White
Write-Host "2. Install Flutter SDK (if not installed): https://flutter.dev/docs/get-started/install" -ForegroundColor White
Write-Host "3. Run mobile app:" -ForegroundColor White
Write-Host "   cd mobile_app" -ForegroundColor Gray
Write-Host "   flutter pub get" -ForegroundColor Gray
Write-Host "   flutter test" -ForegroundColor Gray
Write-Host "   flutter run" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run web app:" -ForegroundColor White
Write-Host "   cd web_app_react" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "For detailed setup instructions, see: ENVIRONMENT_SETUP.md" -ForegroundColor Cyan
Write-Host ""
