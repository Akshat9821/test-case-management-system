# Setup Instructions

## Quick Start Guide

### 1. Prerequisites Installation

#### Install PostgreSQL
- **macOS**: `brew install postgresql@14`
- **Linux**: `sudo apt-get install postgresql postgresql-contrib`
- **Windows**: Download from https://www.postgresql.org/download/

#### Install Redis
- **macOS**: `brew install redis`
- **Linux**: `sudo apt-get install redis-server`
- **Windows**: Download from https://redis.io/download/

#### Install Node.js
- Download from https://nodejs.org/ (v18 or higher recommended)

### 2. Database Setup

```bash
# Start PostgreSQL service
# macOS/Linux:
sudo service postgresql start
# or
brew services start postgresql

# Create database
createdb test_case_management

# Or using psql:
psql postgres
CREATE DATABASE test_case_management;
\q
```

### 3. Redis Setup

```bash
# Start Redis server
redis-server

# Or as a service:
# macOS:
brew services start redis
# Linux:
sudo systemctl start redis
```

### 4. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Build TypeScript
npm run build

# Run migrations
npm run migrate

# Seed database with demo data
npm run seed

# Start development server
npm run dev
```

Backend will be available at `http://localhost:5000`
API docs at `http://localhost:5000/api-docs`

### 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_case_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. Check database exists:
   ```bash
   psql -U postgres -l | grep test_case_management
   ```

3. Verify credentials in `.env` file

### Redis Connection Issues

1. Test Redis connection:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. If Redis is not running, start it:
   ```bash
   redis-server
   ```

### Port Already in Use

If port 5000 or 3000 is already in use:

1. Backend: Change `PORT` in `backend/.env`
2. Frontend: Change port in `frontend/vite.config.ts`

### Module Not Found Errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Production Build

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
# Serve the dist/ folder with a web server like nginx
```

## Demo Data

After running `npm run seed` in the backend, you'll have:

- 4 demo users (admin, test-lead, tester, read-only)
- 1 demo project
- 3 sample test cases
- 1 test suite
- Sample test executions

Login credentials are displayed in the terminal after seeding.



