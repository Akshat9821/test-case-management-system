#!/bin/bash

echo "🚀 Starting Test Case Management System on Railway..."

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build

# Run migrations (only once)
echo "📊 Running database migrations..."
npm run migrate

# Seed the database with initial data
echo "🌱 Seeding database..."
npm run seed

# Go back to root and start the application
echo "🌟 Starting application server..."
cd ..
node backend/dist/server.js
