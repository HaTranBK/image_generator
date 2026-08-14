#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo " Running All Test Suites                 "
echo "========================================="

# 1. Install root dependencies if not present
if [ ! -d "node_modules" ]; then
  echo "-> Installing root workspace dependencies..."
  npm install
fi

# 2. Run backend tests
echo "-> Preparing & Running Backend NestJS tests..."
cd backend
if [ ! -d "node_modules" ]; then
  echo "--> Installing backend dependencies..."
  npm install
fi
# Generate prisma client just in case
npx prisma generate
npm run test

# 3. Run frontend tests
echo "-> Preparing & Running Frontend Next.js tests..."
cd ../frontend
if [ ! -d "node_modules" ]; then
  echo "--> Installing frontend dependencies..."
  npm install
fi
npm run test

echo "========================================="
echo " All tests successfully passed!         "
echo "========================================="
