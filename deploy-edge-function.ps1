# PowerShell script to deploy Supabase edge function
# Run as: .\deploy-edge-function.ps1

Write-Host "🚀 Deploying VoltDash Edge Functions..." -ForegroundColor Green
Write-Host ""

# Check if supabase CLI is installed
$supabase = Get-Command npx -ErrorAction SilentlyContinue
if (-not $supabase) {
    Write-Host "❌ npx not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to project
$projectPath = "C:\Users\mhmd\Desktop\final project dani"
Set-Location $projectPath

Write-Host "📍 Working in: $projectPath" -ForegroundColor Cyan

# Check if already logged in
Write-Host "🔐 Checking Supabase login status..." -ForegroundColor Yellow
$loginStatus = npx supabase status 2>&1
if ($loginStatus -match "not logged in") {
    Write-Host "Please login first:" -ForegroundColor Red
    npx supabase login
}

# Link project if not linked
if (-not (Test-Path "$projectPath\supabase\.temp\*")) {
    Write-Host "🔗 Linking Supabase project..." -ForegroundColor Yellow
    npx supabase link --project-ref hqszihvjqscrwdzrwbyg
}

# Deploy the function
Write-Host "📤 Deploying create-user function..." -ForegroundColor Yellow
npx supabase functions deploy create-user --project-ref hqszihvjqscrwdzrwbyg

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Add secrets in Supabase Dashboard:" -ForegroundColor White
    Write-Host "   - Go to: https://supabase.com/dashboard/project/hqszihvjqscrwdzrwbyg/functions" -ForegroundColor White
    Write-Host "   - Click on 'create-user' function" -ForegroundColor White
    Write-Host "   - Click 'Secrets' tab" -ForegroundColor White
    Write-Host "   - Add these secrets:" -ForegroundColor White
    Write-Host "     * SUPABASE_SERVICE_ROLE_KEY (from Settings → API → service_role secret)" -ForegroundColor Yellow
    Write-Host "     * SUPABASE_ANON_KEY (from Settings → API → anon public)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Test the function by signing in and creating a user" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
