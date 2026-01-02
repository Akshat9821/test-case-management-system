import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import './Projects.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const Projects: React.FC = () => {
  const { currentProject, setCurrentProject } = useProject();
  const { hasRole } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    status: 'active',
  });

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasRole(['admin', 'test-lead'])) return;

    try {
      await axios.post(`${API_URL}/projects`, formData);
      setShowModal(false);
      setFormData({ name: '', description: '', version: '', status: 'active' });
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create project');
    }
  };

  const handleSelectProject = useCallback((project: any) => {
    setCurrentProject(project);
  }, [setCurrentProject]);

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <h1>Projects</h1>
        {hasRole(['admin', 'test-lead']) && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Create Project
          </button>
        )}
      </div>

      <div className="projects-grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`project-card ${currentProject?.id === project.id ? 'active' : ''}`}
            onClick={() => handleSelectProject(project)}
          >
            <h3>{project.name}</h3>
            <p className="project-description">{project.description}</p>
            <div className="project-meta">
              <span className="project-version">v{project.version || '1.0.0'}</span>
              <span className={`project-status ${project.status}`}>{project.status}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label>Project Name</label>
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
              <div className="form-group">
                <label>Version</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
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

