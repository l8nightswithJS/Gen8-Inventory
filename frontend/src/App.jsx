// src/App.jsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Navbar       from './components/Navbar'
import IdleLogout   from './components/IdleLogout'
import Dashboard    from './pages/Dashboard'
import ClientPage   from './pages/ClientPage'
import UsersPage    from './pages/UsersPage'
import Login        from './pages/Login'
import SplashPage   from './pages/SplashPage'
import PrivateRoute from './components/PrivateRoute'
import Footer from './components/Footer'  

export default function App() {
  return (
    <Router>
      {/* full-height flex container */}
      <div className="flex flex-col h-full">
        {/* top bar + idle watcher */}
        <Navbar />
        <IdleLogout timeout={15 * 60 * 1000} />

        {/* main content area */}
        <div className="flex-grow overflow-auto">
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
        </div>

        {/* sticky footer */}
        <Footer />
      </div>
    </Router>
  )
}
