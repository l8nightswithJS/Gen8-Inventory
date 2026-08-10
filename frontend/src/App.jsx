import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { useTheme } from './hooks/useTheme';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import HelpPage from './pages/HelpPage';
import ReportProblemPage from './pages/ReportProblemPage';
import Dashboard from './pages/Dashboard';
import ClientPage from './pages/ClientPage';
import AlertsPage from './pages/AlertsPage';
import UsersPage from './pages/UsersPage';
import StandaloneScanPage from './pages/StandaloneScanPage';
import MasterInventoryPage from './pages/MasterInventoryPage';
import LocationsPage from './pages/LocationsPage';
import ReceivingPage from './pages/ReceivingPage';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function currentRole() {
  return localStorage.getItem('role') || '';
}

function RoleRoute({ allowed, children }) {
  return allowed.includes(currentRole()) ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  useTheme();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/report-problem" element={<ReportProblemPage />} />

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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients/:clientId" element={<ClientPage />} />
          <Route path="clients/:clientId/alerts" element={<AlertsPage />} />
          <Route path="scan" element={<StandaloneScanPage />} />
          <Route path="clients/:clientId/scan" element={<StandaloneScanPage />} />
          <Route
            path="receiving"
            element={
              <RoleRoute allowed={['admin', 'inventory_staff']}>
                <ReceivingPage />
              </RoleRoute>
            }
          />
          <Route
            path="users"
            element={
              <RoleRoute allowed={['admin']}>
                <UsersPage />
              </RoleRoute>
            }
          />
          <Route
            path="inventory/master"
            element={
              <RoleRoute allowed={['admin']}>
                <MasterInventoryPage />
              </RoleRoute>
            }
          />
          <Route
            path="locations"
            element={
              <RoleRoute allowed={['admin']}>
                <LocationsPage />
              </RoleRoute>
            }
          />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
