import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Users.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const Users: React.FC = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasRole(['admin'])) {
      fetchUsers();
    }
  }, [fetchUsers, hasRole]);

  const handleRoleUpdate = useCallback(async (userId: number, newRole: string) => {
    try {
      await axios.put(`${API_URL}/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update user role');
    }
  }, [fetchUsers]);

  if (!hasRole(['admin'])) {
    return <div className="no-access">Access denied. Admin role required.</div>;
  }

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <h1>User Management</h1>
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                  className="role-select"
                >
                  <option value="admin">Admin</option>
                  <option value="test-lead">Test Lead</option>
                  <option value="tester">Tester</option>
                  <option value="read-only">Read-Only</option>
                </select>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                <span className="role-badge">{user.role}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

