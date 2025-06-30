// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ClientPage from './pages/ClientPage';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import UsersPage from './pages/UsersPage';
import EditItemPage from './pages/EditItemPage';

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/clients/:clientId"
          element={
            <PrivateRoute>
              <ClientPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <UsersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <PrivateRoute>
              <EditItemPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}
