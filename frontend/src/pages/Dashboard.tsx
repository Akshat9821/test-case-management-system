import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const Dashboard: React.FC = () => {
  const { currentProject } = useProject();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [currentProject]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = currentProject ? { project_id: currentProject.id } : {};
      const response = await axios.get(`${API_URL}/analytics/dashboard`, { params });
      setAnalytics(response.data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      // Set default analytics to prevent white screen
      setAnalytics({
        summary: { passed: 0, failed: 0, blocked: 0, skipped: 0, total_executions: 0, total_test_cases: 0, pending: 0 },
        trends: [],
        priority_distribution: [],
        tester_progress: [],
        defects: { total_defects: 0, open_defects: 0, resolved_defects: 0, closed_defects: 0 },
        coverage: { covered: 0, total: 0, percentage: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoize chart data calculations
  const pieChartData = useMemo(() => {
    if (!analytics?.summary) return null;
    const summary = analytics.summary;
    return {
      labels: ['Passed', 'Failed', 'Blocked', 'Skipped'],
      datasets: [
        {
          data: [
            summary.passed || 0,
            summary.failed || 0,
            summary.blocked || 0,
            summary.skipped || 0,
          ],
          backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#9e9e9e'],
        },
      ],
    };
  }, [analytics]);

  const lineChartData = useMemo(() => {
    if (!analytics?.trends) return null;
    return {
      labels: analytics.trends.map((t: any) => new Date(t.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Passed',
          data: analytics.trends.map((t: any) => t.passed),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
        },
        {
          label: 'Failed',
          data: analytics.trends.map((t: any) => t.failed),
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
        },
      ],
    };
  }, [analytics]);

  const barChartData = useMemo(() => {
    if (!analytics?.priority_distribution) return null;
    return {
      labels: analytics.priority_distribution.map((p: any) => p.priority),
      datasets: [
        {
          label: 'Test Cases',
          data: analytics.priority_distribution.map((p: any) => p.count),
          backgroundColor: ['#f44336', '#ff9800', '#ffc107', '#4caf50'],
        },
      ],
    };
  }, [analytics]);

  if (loading && !analytics) {
    return (
      <div className="dashboard-loading" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading dashboard...</h2>
        <p>Please wait while we fetch your data.</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="dashboard-error" style={{ padding: '2rem' }}>
        <h2>Dashboard</h2>
        <p>No data available. Please create a project and test cases to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      {currentProject && (
        <div className="project-info">
          <h2>{currentProject.name}</h2>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Test Cases</h3>
          <p className="stat-value">{analytics.summary?.total_test_cases || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Executions</h3>
          <p className="stat-value">{analytics.summary?.total_executions || 0}</p>
        </div>
        <div className="stat-card success">
          <h3>Passed</h3>
          <p className="stat-value">{analytics.summary?.passed || 0}</p>
        </div>
        <div className="stat-card error">
          <h3>Failed</h3>
          <p className="stat-value">{analytics.summary?.failed || 0}</p>
        </div>
        <div className="stat-card warning">
          <h3>Blocked</h3>
          <p className="stat-value">{analytics.summary?.blocked || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p className="stat-value">{analytics.summary?.pending || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Test Coverage</h3>
          <p className="stat-value">{analytics.coverage?.percentage || 0}%</p>
        </div>
        <div className="stat-card">
          <h3>Open Defects</h3>
          <p className="stat-value">{analytics.defects?.open_defects || 0}</p>
        </div>
      </div>

      <div className="charts-grid">
        {pieChartData && (
          <div className="chart-card">
            <h3>Test Status Distribution</h3>
            <Pie data={pieChartData} />
          </div>
        )}

        {lineChartData && (
          <div className="chart-card">
            <h3>Execution Trends (Last 30 Days)</h3>
            <Line data={lineChartData} options={{ responsive: true }} />
          </div>
        )}

        {barChartData && (
          <div className="chart-card">
            <h3>Test Cases by Priority</h3>
            <Bar data={barChartData} options={{ responsive: true }} />
          </div>
        )}
      </div>

      {analytics.tester_progress && analytics.tester_progress.length > 0 && (
        <div className="tester-progress">
          <h3>Test Execution Progress by Tester</h3>
          <table>
            <thead>
              <tr>
                <th>Tester</th>
                <th>Total</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Blocked</th>
              </tr>
            </thead>
            <tbody>
              {analytics.tester_progress.map((tester: any) => (
                <tr key={tester.id}>
                  <td>{tester.name}</td>
                  <td>{tester.total}</td>
                  <td className="success">{tester.passed}</td>
                  <td className="error">{tester.failed}</td>
                  <td className="warning">{tester.blocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

