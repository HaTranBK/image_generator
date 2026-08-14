#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo " Starting Gradion Assessment App Stack   "
echo "========================================="

# 1. Install root dependencies if not present
if [ ! -d "node_modules" ]; then
  echo "-> Installing root workspace dependencies..."
  npm install
fi

# 2. Check and install backend dependencies, start DB
echo "-> Preparing Backend..."
cd backend
if [ ! -d "node_modules" ]; then
  echo "--> Installing backend dependencies..."
  npm install
fi

# Start Docker containers (PostgreSQL)
if command -v docker-compose &> /dev/null; then
  echo "--> Starting PostgreSQL database via Docker Compose..."
  docker-compose up -d
  echo "--> Waiting for database to be ready..."
  sleep 3
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
  echo "--> Starting PostgreSQL database via Docker Compose (V2)..."
  docker compose up -d
  echo "--> Waiting for database to be ready..."
  sleep 3
else
  echo "--> WARNING: docker-compose/docker command not found. Make sure your PostgreSQL database is running manually."
fi

# Run Prisma schema push & client generation
echo "--> Applying database schema & generating Prisma client..."
npx prisma db push

cd ..

# 3. Check and install frontend dependencies
echo "-> Preparing Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "--> Installing frontend dependencies..."
  npm install
fi
cd ..

# 4. Start both frontend and backend concurrently using concurrently package
echo "-> Starting dev servers concurrently..."
npx concurrently \
  -n "Backend,Frontend" \
  -c "blue,green" \
  "npm run start:dev --prefix backend" \
  "npm run dev --prefix frontend"
