#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo " Starting Gradion Assessment App Stack   "
echo "========================================="

# Start NestJS backend in background
echo "-> Starting backend NestJS dev server..."
cd backend
npm run start:dev &
BACKEND_PID=$!

# Start Next.js frontend in background
echo "-> Starting frontend Next.js dev server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Handle shutdown gracefully
cleanup() {
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
