#!/bin/bash

echo "🚀 Setting up Test Case Management System..."

# Create .env files if they don't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env..."
    cat > backend/.env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_case_management
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-in-production-12345
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
EOF
fi

if [ ! -f frontend/.env ]; then
    echo "Creating frontend/.env..."
    echo "VITE_API_URL=http://localhost:5000/api" > frontend/.env
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Check if database exists
echo "🗄️  Checking database..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw test_case_management; then
    echo "Database 'test_case_management' already exists"
else
    echo "Creating database 'test_case_management'..."
    createdb -U postgres test_case_management || psql -U postgres -c "CREATE DATABASE test_case_management;"
fi

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build

# Run migrations
echo "📊 Running database migrations..."
npm run migrate

# Seed database
echo "🌱 Seeding database..."
npm run seed

cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start Redis: redis-server (or brew services start redis)"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"



