import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import LandingPage  from './pages/LandingPage'
import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import ClientPage   from './pages/ClientPage'
import UsersPage    from './pages/UsersPage'
import AlertsPage   from './pages/AlertsPage'
import PrivateRoute from './components/PrivateRoute'
import Navbar       from './components/Navbar'
import Footer       from './components/Footer'

export default function App() {
  return (
    <Router>
      <Routes>
        {/* public */}
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* protected */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <PrivateLayout />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}

function PrivateLayout() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar />

      <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        <Routes>
          <Route path="dashboard"               element={<Dashboard />} />
          <Route path="clients/:clientId"       element={<ClientPage />} />
          <Route
            path="clients/:clientId/alerts"
            element={<AlertsPage />}
          />
          <Route path="users"                   element={<UsersPage />} />
          <Route
            path="*"
            element={<Navigate to="dashboard" replace />}
          />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
