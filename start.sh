#!/bin/bash

echo "🚀 Starting Test Case Management System..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Starting Redis..."
    redis-server --daemonize yes || brew services start redis
    sleep 2
fi

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Application started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "  Backend: tail -f backend.log"
echo ""
echo "🌐 Access the application at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:5000"
echo "  API Docs: http://localhost:5000/api-docs"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"



