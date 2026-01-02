import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import './TestExecutions.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const TestExecutions: React.FC = () => {
  const { currentProject } = useProject();
  const { user, hasRole } = useAuth();
  const [executions, setExecutions] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    test_case_id: '',
    status: 'Pending',
    comments: '',
  });

  const canExecute = hasRole(['admin', 'test-lead', 'tester']);

  const fetchExecutions = useCallback(async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/testexecutions`, {
        params: { project_id: currentProject.id, limit: 50 },
      });
      setExecutions(response.data.data);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const fetchTestCases = useCallback(async () => {
    if (!currentProject) return;

    try {
      const response = await axios.get(`${API_URL}/testcases`, {
        params: { project_id: currentProject.id, limit: 100 },
      });
      setTestCases(response.data.data);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchExecutions();
    if (canExecute) {
      fetchTestCases();
    }
  }, [fetchExecutions, fetchTestCases, canExecute]);

  const handleCreateExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canExecute || !currentProject) return;

    try {
      await axios.post(`${API_URL}/testexecutions`, {
        ...formData,
        project_id: currentProject.id,
      });
      setShowModal(false);
      setFormData({ test_case_id: '', status: 'Pending', comments: '' });
      fetchExecutions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create test execution');
    }
  };

  const handleUpdateStatus = useCallback(async (id: number, status: string) => {
    if (!canExecute) return;

    try {
      await axios.put(`${API_URL}/testexecutions/${id}`, { status });
      fetchExecutions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update execution');
    }
  }, [canExecute, fetchExecutions]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pass':
        return '#4caf50';
      case 'Fail':
        return '#f44336';
      case 'Blocked':
        return '#ff9800';
      case 'Skipped':
        return '#9e9e9e';
      default:
        return '#2196f3';
    }
  };

  if (!currentProject) {
    return <div className="no-project">Please select a project first</div>;
  }

  if (loading) {
    return <div className="loading">Loading test executions...</div>;
  }

  return (
    <div className="test-executions-page">
      <div className="page-header">
        <h1>Test Executions</h1>
        {canExecute && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Record Execution
          </button>
        )}
      </div>

      <div className="executions-list">
        {executions.length > 0 ? (
          executions.map((execution) => (
            <div key={execution.id} className="execution-card">
              <div className="execution-header">
                <h3>{execution.test_case_title}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(execution.status) }}
                >
                  {execution.status}
                </span>
              </div>
              <div className="execution-meta">
                <span>Executed by: {execution.executed_by_name}</span>
                <span>
                  {new Date(execution.execution_date).toLocaleString()}
                </span>
              </div>
              {execution.comments && (
                <p className="execution-comments">{execution.comments}</p>
              )}
              {canExecute && (
                <div className="execution-actions">
                  <select
                    value={execution.status}
                    onChange={(e) => handleUpdateStatus(execution.id, e.target.value)}
                    style={{ backgroundColor: getStatusColor(execution.status), color: 'white' }}
                  >
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Skipped">Skipped</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-results">No test executions found</div>
        )}
      </div>

      {showModal && canExecute && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Record Test Execution</h2>
            <form onSubmit={handleCreateExecution}>
              <div className="form-group">
                <label>Test Case *</label>
                <select
                  value={formData.test_case_id}
                  onChange={(e) => setFormData({ ...formData, test_case_id: e.target.value })}
                  required
                >
                  <option value="">Select a test case</option>
                  {testCases.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Skipped">Skipped</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comments</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

