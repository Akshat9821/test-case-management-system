# Quick Start Guide

## Option 1: Automated Setup (Recommended)

Run the setup script:
```bash
./setup.sh
```

Then start the application:
```bash
./start.sh
```

## Option 2: Manual Setup

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 2: Create Environment Files

**backend/.env:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_case_management
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-in-production-12345
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Setup Database

```bash
# Create database
createdb test_case_management

# Or using psql:
psql postgres -c "CREATE DATABASE test_case_management;"
```

### Step 4: Build and Migrate

```bash
cd backend
npm run build
npm run migrate
npm run seed
```

### Step 5: Start Services

**Terminal 1 - Redis:**
```bash
redis-server
# Or: brew services start redis
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs

## Demo Credentials

- **Admin**: admin@test.com / admin123
- **Test Lead**: lead@test.com / lead123
- **Tester**: tester@test.com / tester123
- **Read-Only**: readonly@test.com / readonly123

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running: `brew services start postgresql@14`
- Check credentials in `backend/.env`

### Redis Connection Error
- Start Redis: `redis-server` or `brew services start redis`
- Test connection: `redis-cli ping` (should return PONG)

### Port Already in Use
- Change PORT in `backend/.env` for backend
- Change port in `frontend/vite.config.ts` for frontend
