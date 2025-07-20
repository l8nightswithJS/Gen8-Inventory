// src/App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Navbar        from './components/Navbar'
import IdleLogout    from './components/IdleLogout'    // ← new
import Dashboard     from './pages/Dashboard'
import ClientPage    from './pages/ClientPage'
import UsersPage     from './pages/UsersPage'
import Login         from './pages/Login'
import SplashPage    from './pages/SplashPage'
import PrivateRoute  from './components/PrivateRoute'

export default function App() {
  return (
    <Router>
      {/* kick off our idle‑logout watcher */}
      <IdleLogout timeout={15 * 60 * 1000} />

      <Navbar />

      <Routes>
        {/* Splash */}
        <Route path="/" element={<SplashPage />} />

        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
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

        {/* Catch‑all → Splash */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
