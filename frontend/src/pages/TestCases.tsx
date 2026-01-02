import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import axios from 'axios';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import './TestCases.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface TestCase {
  id: number;
  title: string;
  priority: string;
  type: string;
  assigned_to_name?: string;
  execution_count: number;
}

export const TestCases: React.FC = () => {
  const { currentProject } = useProject();
  const { hasRole } = useAuth();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    priority: '',
    type: '',
    search: '',
    page: 1,
  });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    type: 'Functional',
    pre_conditions: '',
    post_conditions: '',
    tags: '',
    assigned_to: '',
    steps: [{ step_number: 1, action: '', expected_result: '' }],
  });

  const canEdit = hasRole(['admin', 'test-lead']);

  const fetchTestCases = useCallback(async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      const params = {
        project_id: currentProject.id,
        ...filters,
        limit: 20,
      };
      const response = await axios.get(`${API_URL}/testcases`, { params });
      setTestCases(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProject, filters]);

  useEffect(() => {
    setLoading(true);
    fetchTestCases();
  }, [fetchTestCases]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !currentProject) return;

    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      await axios.post(`${API_URL}/testcases`, {
        ...formData,
        project_id: currentProject.id,
        tags: tagsArray,
      });
      setShowModal(false);
      resetForm();
      fetchTestCases();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create test case');
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!canEdit || !confirm('Are you sure you want to delete this test case?')) return;

    try {
      await axios.delete(`${API_URL}/testcases/${id}`);
      fetchTestCases();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete test case');
    }
  }, [canEdit, fetchTestCases]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      type: 'Functional',
      pre_conditions: '',
      post_conditions: '',
      tags: '',
      assigned_to: '',
      steps: [{ step_number: 1, action: '', expected_result: '' }],
    });
    setSelectedCase(null);
  };

  // Memoized filtered test cases
  const filteredCases = useMemo(() => {
    return testCases.filter(tc => {
      if (filters.search && !tc.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [testCases, filters.search]);

  const Row = ({ index, style }: any) => {
    const testCase = filteredCases[index];
    if (!testCase) return null;

    return (
      <div style={style} className="test-case-row">
        <div className="test-case-info">
          <h4>{testCase.title}</h4>
          <div className="test-case-meta">
            <span className={`priority ${testCase.priority.toLowerCase()}`}>{testCase.priority}</span>
            <span className="type">{testCase.type}</span>
            {testCase.assigned_to_name && <span className="assigned">Assigned to: {testCase.assigned_to_name}</span>}
            <span className="executions">Executions: {testCase.execution_count}</span>
          </div>
        </div>
        {canEdit && (
          <div className="test-case-actions">
            <button onClick={() => handleDelete(testCase.id)} className="btn-danger">
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!currentProject) {
    return <div className="no-project">Please select a project first</div>;
  }

  if (loading) {
    return <div className="loading">Loading test cases...</div>;
  }

  return (
    <div className="test-cases-page">
      <div className="page-header">
        <h1>Test Cases</h1>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Create Test Case
          </button>
        )}
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search test cases..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="Functional">Functional</option>
          <option value="Integration">Integration</option>
          <option value="Regression">Regression</option>
          <option value="Smoke">Smoke</option>
          <option value="UI">UI</option>
          <option value="API">API</option>
        </select>
      </div>

      <div className="test-cases-list">
        {filteredCases.length > 0 ? (
          filteredCases.length > 50 ? (
            <List
              height={600}
              itemCount={filteredCases.length}
              itemSize={100}
              width="100%"
            >
              {Row}
            </List>
          ) : (
            filteredCases.map((testCase) => (
              <div key={testCase.id} className="test-case-row">
                <div className="test-case-info">
                  <h4>{testCase.title}</h4>
                  <div className="test-case-meta">
                    <span className={`priority ${testCase.priority.toLowerCase()}`}>{testCase.priority}</span>
                    <span className="type">{testCase.type}</span>
                    {testCase.assigned_to_name && <span className="assigned">Assigned to: {testCase.assigned_to_name}</span>}
                    <span className="executions">Executions: {testCase.execution_count}</span>
                  </div>
                </div>
                {canEdit && (
                  <div className="test-case-actions">
                    <button onClick={() => handleDelete(testCase.id)} className="btn-danger">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          <div className="no-results">No test cases found</div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {filters.page} of {pagination.totalPages}
          </span>
          <button
            disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedCase ? 'Edit' : 'Create'} Test Case</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="Functional">Functional</option>
                    <option value="Integration">Integration</option>
                    <option value="Regression">Regression</option>
                    <option value="Smoke">Smoke</option>
                    <option value="UI">UI</option>
                    <option value="API">API</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Pre-conditions</label>
                <textarea
                  value={formData.pre_conditions}
                  onChange={(e) => setFormData({ ...formData, pre_conditions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Post-conditions</label>
                <textarea
                  value={formData.post_conditions}
                  onChange={(e) => setFormData({ ...formData, post_conditions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., login, authentication"
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {selectedCase ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

