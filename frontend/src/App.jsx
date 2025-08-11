import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientPage from './pages/ClientPage';
import AlertsPage from './pages/AlertsPage';
import UsersPage from './pages/UsersPage';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
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
  );
}

function PrivateLayout() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <Navbar />
      {/* main takes only the space between navbar and footer */}
      <main className="flex-1 min-h-0 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        {/* pages can create their own scroll inside this box */}
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients/:clientId" element={<ClientPage />} />
          <Route path="clients/:clientId/alerts" element={<AlertsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
