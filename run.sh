#!/bin/bash

echo "Starting Google Drive Clone Application..."

# Function to handle cleanup on exit
cleanup() {
    echo "Stopping application..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT

# Start Backend Server
echo "Starting Backend Server on port 5000..."
cd server && npm start &
BACKEND_PID=$!

# Go back to root and start Frontend Client
cd ..
echo "Starting Frontend Client on port 5173..."
cd client && npm run dev &
FRONTEND_PID=$!

echo ""
echo "===================================================="
echo "Application is starting!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo "===================================================="
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for background processes
wait
