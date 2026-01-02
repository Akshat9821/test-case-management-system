import pool from './connection';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const leadPassword = await bcrypt.hash('lead123', 10);
    const testerPassword = await bcrypt.hash('tester123', 10);
    const readonlyPassword = await bcrypt.hash('readonly123', 10);
    
    // Insert demo users
    const users = [
      { email: 'admin@test.com', password: adminPassword, name: 'Admin User', role: 'admin' },
      { email: 'lead@test.com', password: leadPassword, name: 'Test Lead', role: 'test-lead' },
      { email: 'tester@test.com', password: testerPassword, name: 'Test User', role: 'tester' },
      { email: 'readonly@test.com', password: readonlyPassword, name: 'Read Only User', role: 'read-only' },
    ];
    
    const userIds: number[] = [];
    for (const user of users) {
      const result = await client.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role RETURNING id',
        [user.email, user.password, user.name, user.role]
      );
      userIds.push(result.rows[0].id);
    }
    
    const [adminId, leadId, testerId, readonlyId] = userIds;
    
    // Create a demo project
    const projectResult = await client.query(
      'INSERT INTO projects (name, description, version, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Demo Project', 'A sample project for testing the system', '1.0.0', 'active', adminId]
    );
    const projectId = projectResult.rows[0].id;
    
    // Add all users to the project
    await client.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2), ($1, $3), ($1, $4), ($1, $5)',
      [projectId, adminId, leadId, testerId, readonlyId]
    );
    
    // Create test cases
    const testCases = [
      {
        title: 'User Login Functionality',
        description: 'Verify that users can login with valid credentials',
        priority: 'High',
        type: 'Functional',
        pre_conditions: 'User account exists',
        post_conditions: 'User is logged in',
        tags: ['authentication', 'login'],
        assigned_to: testerId
      },
      {
        title: 'Password Reset Flow',
        description: 'Verify password reset functionality',
        priority: 'Medium',
        type: 'Functional',
        pre_conditions: 'User account exists',
        post_conditions: 'Password reset email sent',
        tags: ['authentication', 'password'],
        assigned_to: testerId
      },
      {
        title: 'API Authentication',
        description: 'Verify API endpoints require authentication',
        priority: 'Critical',
        type: 'API',
        pre_conditions: 'API server is running',
        post_conditions: 'Unauthorized requests are rejected',
        tags: ['api', 'security'],
        assigned_to: testerId
      },
    ];
    
    const testCaseIds: number[] = [];
    for (const testCase of testCases) {
      const result = await client.query(
        `INSERT INTO test_cases (title, description, priority, type, pre_conditions, post_conditions, tags, project_id, created_by, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          testCase.title,
          testCase.description,
          testCase.priority,
          testCase.type,
          testCase.pre_conditions,
          testCase.post_conditions,
          testCase.tags,
          projectId,
          leadId,
          testCase.assigned_to
        ]
      );
      const testCaseId = result.rows[0].id;
      testCaseIds.push(testCaseId);
      
      // Add test steps
      await client.query(
        `INSERT INTO test_steps (test_case_id, step_number, action, expected_result)
         VALUES ($1, 1, 'Navigate to login page', 'Login page is displayed'),
                ($1, 2, 'Enter valid credentials', 'Credentials are accepted'),
                ($1, 3, 'Click login button', 'User is redirected to dashboard')`,
        [testCaseId]
      );
    }
    
    // Create a test suite
    const suiteResult = await client.query(
      'INSERT INTO test_suites (name, description, project_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Authentication Test Suite', 'Tests for authentication features', projectId, leadId]
    );
    const suiteId = suiteResult.rows[0].id;
    
    // Add test cases to suite
    for (const testCaseId of testCaseIds) {
      await client.query(
        'INSERT INTO test_suite_cases (suite_id, test_case_id) VALUES ($1, $2)',
        [suiteId, testCaseId]
      );
    }
    
    // Create some test executions
    await client.query(
      `INSERT INTO test_executions (test_case_id, executed_by, status, comments, project_id, suite_id)
       VALUES ($1, $4, 'Pass', 'Test passed successfully', $5, $6),
              ($2, $4, 'Fail', 'Test failed - button not clickable', $5, $6),
              ($3, $4, 'Pass', 'API authentication working correctly', $5, $6)`,
      [testCaseIds[0], testCaseIds[1], testCaseIds[2], testerId, projectId, suiteId]
    );
    
    await client.query('COMMIT');
    console.log('Seed data created successfully');
    console.log('\nDemo Credentials:');
    console.log('Admin: admin@test.com / admin123');
    console.log('Test Lead: lead@test.com / lead123');
    console.log('Tester: tester@test.com / tester123');
    console.log('Read-Only: readonly@test.com / readonly123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seed;

