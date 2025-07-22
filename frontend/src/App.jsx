import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Dashboard    from './pages/Dashboard'
import ClientPage   from './pages/ClientPage'
import UsersPage    from './pages/UsersPage'
import Login        from './pages/Login'
import LandingPage  from './pages/LandingPage'
import PrivateRoute from './components/PrivateRoute'

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 1) Landing page — no nav/footer */}
        <Route path="/" element={<LandingPage />} />

        {/* 2) Login — styled same as landing header */}
        <Route path="/login" element={<Login />} />

        {/* 3) All other routes get protected + wrapped in nav/footer */}
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
