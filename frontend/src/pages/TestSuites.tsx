import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import './TestSuites.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const TestSuites: React.FC = () => {
  const { currentProject } = useProject();
  const { hasRole } = useAuth();
  const [suites, setSuites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuite, setSelectedSuite] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const canEdit = hasRole(['admin', 'test-lead']);

  const fetchSuites = useCallback(async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/testsuites`, {
        params: { project_id: currentProject.id },
      });
      setSuites(response.data);
    } catch (error) {
      console.error('Error fetching test suites:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchSuites();
  }, [fetchSuites]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !currentProject) return;

    try {
      await axios.post(`${API_URL}/testsuites`, {
        ...formData,
        project_id: currentProject.id,
      });
      setShowModal(false);
      setFormData({ name: '', description: '' });
      fetchSuites();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create test suite');
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!canEdit || !confirm('Are you sure you want to delete this test suite?')) return;

    try {
      await axios.delete(`${API_URL}/testsuites/${id}`);
      fetchSuites();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete test suite');
    }
  }, [canEdit, fetchSuites]);

  const fetchSuiteDetails = useCallback(async (id: number) => {
    try {
      const response = await axios.get(`${API_URL}/testsuites/${id}`);
      setSelectedSuite(response.data);
    } catch (error) {
      console.error('Error fetching suite details:', error);
    }
  }, []);

  if (!currentProject) {
    return <div className="no-project">Please select a project first</div>;
  }

  if (loading) {
    return <div className="loading">Loading test suites...</div>;
  }

  return (
    <div className="test-suites-page">
      <div className="page-header">
        <h1>Test Suites</h1>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Create Test Suite
          </button>
        )}
      </div>

      <div className="suites-grid">
        {suites.map((suite) => (
          <div key={suite.id} className="suite-card">
            <div className="suite-header">
              <h3>{suite.name}</h3>
              {canEdit && (
                <button
                  className="btn-danger-small"
                  onClick={() => handleDelete(suite.id)}
                >
                  Delete
                </button>
              )}
            </div>
            <p className="suite-description">{suite.description}</p>
            <div className="suite-meta">
              <span>Test Cases: {suite.test_case_count || 0}</span>
              <button
                className="btn-link"
                onClick={() => fetchSuiteDetails(suite.id)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedSuite && (
        <div className="modal-overlay" onClick={() => setSelectedSuite(null)}>
          <div className="modal-content suite-details" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedSuite.name}</h2>
            <p>{selectedSuite.description}</p>
            <h3>Test Cases in Suite</h3>
            {selectedSuite.test_cases && selectedSuite.test_cases.length > 0 ? (
              <ul className="test-cases-list">
                {selectedSuite.test_cases.map((tc: any) => (
                  <li key={tc.id}>
                    <strong>{tc.title}</strong>
                    <span className="priority-badge">{tc.priority}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No test cases in this suite</p>
            )}
            <button onClick={() => setSelectedSuite(null)} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Test Suite</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Suite Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

