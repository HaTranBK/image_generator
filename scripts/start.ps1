Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting Gradion Assessment App Stack   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Install root dependencies if not present
if (-not (Test-Path "node_modules")) {
  Write-Host "-> Installing root workspace dependencies..." -ForegroundColor Yellow
  npm install
}

# 2. Check and install backend dependencies, start DB
Write-Host "-> Preparing Backend..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "node_modules")) {
  Write-Host "--> Installing backend dependencies..." -ForegroundColor Yellow
  npm install
}

# Start Docker containers (PostgreSQL)
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
  Write-Host "--> Starting PostgreSQL database via Docker Compose..." -ForegroundColor Yellow
  docker-compose up -d
  Write-Host "--> Waiting for database to be ready..." -ForegroundColor Yellow
  Start-Sleep -Seconds 3
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "--> Starting PostgreSQL database via Docker Compose (V2)..." -ForegroundColor Yellow
  docker compose up -d
  Write-Host "--> Waiting for database to be ready..." -ForegroundColor Yellow
  Start-Sleep -Seconds 3
} else {
  Write-Warning "--> WARNING: docker-compose/docker command not found. Make sure your PostgreSQL database is running manually."
}

# Run Prisma schema push & client generation
Write-Host "--> Applying database schema & generating Prisma client..." -ForegroundColor Yellow
npx prisma db push

Set-Location ..

# 3. Check and install frontend dependencies
Write-Host "-> Preparing Frontend..." -ForegroundColor Yellow
Set-Location frontend
if (-not (Test-Path "node_modules")) {
  Write-Host "--> Installing frontend dependencies..." -ForegroundColor Yellow
  npm install
}
Set-Location ..

# 4. Start both frontend and backend concurrently using concurrently package
Write-Host "-> Starting dev servers concurrently..." -ForegroundColor Green
npx concurrently -n "Backend,Frontend" -c "blue,green" "npm run start:dev --prefix backend" "npm run dev --prefix frontend"
