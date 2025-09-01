import React from 'react';
import './css/admin.css';

const Admin = () => {
  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
      <div className="admin-grid">
        <div className="admin-card">
          <h2>User Management</h2>
          <ul>
            <li>View Users</li>
            <li>Add User</li>
            <li>Manage Roles</li>
          </ul>
        </div>
        <div className="admin-card">
          <h2>System Settings</h2>
          <ul>
            <li>General Settings</li>
            <li>Email Configuration</li>
            <li>Security Settings</li>
          </ul>
        </div>
        <div className="admin-card">
          <h2>Audit Logs</h2>
          <ul>
            <li>User Activity</li>
            <li>System Logs</li>
            <li>Error Logs</li>
          </ul>
        </div>
        <div className="admin-card">
          <h2>Backup & Restore</h2>
          <ul>
            <li>Database Backup</li>
            <li>Restore Data</li>
            <li>Export Data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Admin; 