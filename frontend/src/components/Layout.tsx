import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/ProjectContext';
import './Layout.css';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/dashboard">Test Case Manager</Link>
        </div>
        <div className="nav-links">
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/projects" className={isActive('/projects') ? 'active' : ''}>
            Projects
          </Link>
          <Link to="/test-cases" className={isActive('/test-cases') ? 'active' : ''}>
            Test Cases
          </Link>
          <Link to="/test-suites" className={isActive('/test-suites') ? 'active' : ''}>
            Test Suites
          </Link>
          <Link to="/test-executions" className={isActive('/test-executions') ? 'active' : ''}>
            Executions
          </Link>
          {hasRole(['admin']) && (
            <Link to="/users" className={isActive('/users') ? 'active' : ''}>
              Users
            </Link>
          )}
        </div>
        <div className="nav-user">
          {currentProject && (
            <span className="current-project">{currentProject.name}</span>
          )}
          <span className="user-name">{user?.name}</span>
          <span className="user-role">{user?.role}</span>
          <button onClick={toggleTheme} className="theme-toggle">
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
};






