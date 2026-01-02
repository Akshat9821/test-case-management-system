-- Users table with role field
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'tester' CHECK (role IN ('admin', 'test-lead', 'tester', 'read-only')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project members (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- Test Suites table
CREATE TABLE IF NOT EXISTS test_suites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  type VARCHAR(50) NOT NULL CHECK (type IN ('Functional', 'Integration', 'Regression', 'Smoke', 'UI', 'API')),
  pre_conditions TEXT,
  post_conditions TEXT,
  tags TEXT[], -- Array of tags
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Suite Cases (mapping table)
CREATE TABLE IF NOT EXISTS test_suite_cases (
  suite_id INTEGER REFERENCES test_suites(id) ON DELETE CASCADE,
  test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
  PRIMARY KEY (suite_id, test_case_id)
);

-- Test Steps table
CREATE TABLE IF NOT EXISTS test_steps (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Executions table
CREATE TABLE IF NOT EXISTS test_executions (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
  executed_by INTEGER REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Pass', 'Fail', 'Blocked', 'Skipped', 'Pending')),
  comments TEXT,
  execution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  suite_id INTEGER REFERENCES test_suites(id),
  defect_id INTEGER, -- Reference to defect if created
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Defects/Bugs table
CREATE TABLE IF NOT EXISTS defects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(50) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  test_execution_id INTEGER REFERENCES test_executions(id),
  test_case_id INTEGER REFERENCES test_cases(id),
  created_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Attachments table
CREATE TABLE IF NOT EXISTS test_attachments (
  id SERIAL PRIMARY KEY,
  test_execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_priority ON test_cases(priority);
CREATE INDEX IF NOT EXISTS idx_test_cases_type ON test_cases(type);
CREATE INDEX IF NOT EXISTS idx_test_cases_assigned_to ON test_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_test_executions_test_case ON test_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_executed_by ON test_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_project ON test_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_date ON test_executions(execution_date);
CREATE INDEX IF NOT EXISTS idx_test_suites_project ON test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);



