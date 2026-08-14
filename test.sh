#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo " Running All Test Suites                 "
echo "========================================="

echo "-> Running Backend NestJS tests..."
cd backend
npm run test

echo "-> Running Frontend Next.js tests..."
cd ../frontend
npm run test

echo "========================================="
echo " All tests successfully passed!         "
echo "========================================="
