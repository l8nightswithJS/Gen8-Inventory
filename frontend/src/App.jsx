import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { useTheme } from './hooks/useTheme'; // Import the theme hook
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientPage from './pages/ClientPage';
import AlertsPage from './pages/AlertsPage';
import UsersPage from './pages/UsersPage';
import StandaloneScanPage from './pages/StandaloneScanPage';
import MasterInventoryPage from './pages/MasterInventoryPage';
import LocationsPage from './pages/LocationsPage';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  useTheme(); // Call the hook to activate theme management

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Private routes */}
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
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients/:clientId" element={<ClientPage />} />
          <Route path="clients/:clientId/alerts" element={<AlertsPage />} />
          <Route path="scan" element={<StandaloneScanPage />} />
          <Route
            path="clients/:clientId/scan"
            element={<StandaloneScanPage />}
          />
          <Route path="users" element={<UsersPage />} />
          <Route path="inventory/master" element={<MasterInventoryPage />} />
          <Route path="locations" element={<LocationsPage />} />
          {/* Redirect any unknown private path to dashboard */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
