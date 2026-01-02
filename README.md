# Test Case Management System

A full-stack Test Case Management application that allows teams to create, manage, and track test cases, test suites, and test execution results for software projects.

## Features

- **User Authentication**: JWT-based authentication with role-based access control (RBAC)
- **Project Management**: Create and manage multiple test projects
- **Test Case Management**: Create, edit, delete, and organize test cases with detailed attributes
- **Test Suite Management**: Organize test cases into suites for batch execution
- **Test Execution**: Record and track test execution results with status tracking
- **Dashboard & Analytics**: Interactive charts and metrics for test execution trends
- **Performance Optimizations**: Lazy loading, pagination, virtual scrolling, and Redis caching
- **Security**: XSS and SQL injection protection, input validation, rate limiting

## Tech Stack

### Frontend
- React 18+ with TypeScript
- React Router for navigation
- Chart.js for data visualization
- React Window for virtual scrolling
- Vite for build tooling

### Backend
- Node.js with Express.js
- PostgreSQL database
- Redis for caching
- JWT for authentication
- Swagger for API documentation

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd test-case-management-system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=test_case_management
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-in-production
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
```

### 3. Database Setup

Create the PostgreSQL database:

```bash
createdb test_case_management
```

Run migrations:

```bash
npm run build
npm run migrate
```

Seed the database with demo data:

```bash
npm run seed
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```env
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Start Redis

```bash
redis-server
```

### Start Backend

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`
API documentation will be available at `http://localhost:5000/api-docs`

### Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## Demo Credentials

The seed script creates the following demo users:

- **Admin**: `admin@test.com` / `admin123`
- **Test Lead**: `lead@test.com` / `lead123`
- **Tester**: `tester@test.com` / `tester123`
- **Read-Only**: `readonly@test.com` / `readonly123`

## User Roles

- **admin**: Full access to all features including user management
- **test-lead**: Can create/edit/delete test cases and suites, assign tests, view reports
- **tester**: Can execute tests and update test results
- **read-only**: Can only view test cases, results, and reports

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project (admin, test-lead)
- `PUT /api/projects/:id` - Update project (admin, test-lead)

### Test Cases
- `GET /api/testcases` - Get test cases with filters and pagination
- `GET /api/testcases/:id` - Get test case by ID
- `POST /api/testcases` - Create test case (admin, test-lead)
- `PUT /api/testcases/:id` - Update test case (admin, test-lead)
- `DELETE /api/testcases/:id` - Delete test case (admin, test-lead)
- `POST /api/testcases/bulk` - Bulk operations (admin, test-lead)

### Test Suites
- `GET /api/testsuites` - Get all test suites
- `GET /api/testsuites/:id` - Get test suite by ID
- `POST /api/testsuites` - Create test suite (admin, test-lead)
- `PUT /api/testsuites/:id` - Update test suite (admin, test-lead)
- `DELETE /api/testsuites/:id` - Delete test suite (admin, test-lead)

### Test Executions
- `GET /api/testexecutions` - Get test executions with filters
- `GET /api/testexecutions/:id` - Get test execution by ID
- `POST /api/testexecutions` - Create test execution (admin, test-lead, tester)
- `PUT /api/testexecutions/:id` - Update test execution (admin, test-lead, tester)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics (cached 15 min)
- `GET /api/analytics/trends` - Get execution trends (cached 15 min)

### Users
- `GET /api/users` - Get all users (admin only)
- `PUT /api/users/:id/role` - Update user role (admin only)

Full API documentation is available at `/api-docs` when the backend is running.

## Performance Features

- **Lazy Loading**: Route-based code splitting with React.lazy()
- **Virtual Scrolling**: Efficient rendering of large test case lists
- **Pagination**: Server-side pagination for test cases and executions
- **Redis Caching**: 
  - Analytics cached for 15 minutes
  - Test suite lists cached for 30 minutes
  - Project metadata cached for 1 hour
- **Rate Limiting**: 
  - Auth endpoints: 5 requests per 15 minutes
  - Test case CRUD: 100 requests per hour
  - Test execution: 200 requests per hour
  - Analytics: 50 requests per hour

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- XSS protection
- SQL injection prevention (parameterized queries)
- Rate limiting
- Helmet.js for security headers

## Project Structure

```
test-case-management-system/
├── backend/
│   ├── src/
│   │   ├── db/              # Database connection, migrations, seeds
│   │   ├── middleware/      # Auth, rate limiting, caching, validation
│   │   ├── routes/          # API routes
│   │   └── server.ts        # Express server setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts (Auth, Theme, Project)
│   │   ├── pages/           # Page components
│   │   ├── App.tsx          # Main app component with routing
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Development

### Backend Development

```bash
cd backend
npm run dev  # Runs with ts-node-dev for hot reloading
```

### Frontend Development

```bash
cd frontend
npm run dev  # Runs Vite dev server
```

### Building for Production

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

## Database Schema

The application uses the following main tables:
- `users` - User accounts with roles
- `projects` - Test projects
- `test_cases` - Individual test cases
- `test_suites` - Collections of test cases
- `test_executions` - Test execution records
- `test_steps` - Steps for each test case
- `defects` - Bugs/defects linked to test executions
- `test_attachments` - File attachments for test executions

See `backend/src/db/migrations/001_initial_schema.sql` for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please open an issue in the repository.


