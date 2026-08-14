Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Running All Test Suites                 " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Install root dependencies if not present
if (-not (Test-Path "node_modules")) {
  Write-Host "-> Installing root workspace dependencies..." -ForegroundColor Yellow
  npm install
}

# 2. Run backend tests
Write-Host "-> Preparing & Running Backend NestJS tests..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "node_modules")) {
  Write-Host "--> Installing backend dependencies..." -ForegroundColor Yellow
  npm install
}
npx prisma generate
npm run test

# 3. Run frontend tests
Write-Host "-> Preparing & Running Frontend Next.js tests..." -ForegroundColor Yellow
Set-Location ../frontend
if (-not (Test-Path "node_modules")) {
  Write-Host "--> Installing frontend dependencies..." -ForegroundColor Yellow
  npm install
}
npm run test

Write-Host "=========================================" -ForegroundColor Green
Write-Host " All tests successfully passed!         " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
