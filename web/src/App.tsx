/**
 * ============================================================================
 * APP ROOT COMPONENT
 * ============================================================================
 * 
 * Main React component with:
 * - Auth Context Provider (global auth state)
 * - React Router (page routing)
 * - Layout (header, main content)
 * 
 * Route Structure:
 * - /login          → Login page (public)
 * - /register       → Register page (public)
 * - /upload         → Upload page (protected)
 * - /gallery        → Photo gallery (protected)
 * - /               → Redirect to /login or /upload based on auth
 * - *               → 404 Not Found
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContextProvider';
import { useAuth } from './hooks/useAuth';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';

/**
 * Main app routes
 * Uses useAuth hook to check if user is authenticated
 */
const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Header />
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg">Upload Page (Phase 4.2)</p>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gallery"
        element={
          <ProtectedRoute>
            <Header />
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg">Gallery Page (Phase 5)</p>
            </div>
          </ProtectedRoute>
        }
      />

      {/* Root Redirect */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/upload" replace /> : <Navigate to="/login" replace />} />

      {/* Fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-8">Page not found</p>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Go Home
              </button>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

/**
 * Main App component
 * Wraps everything with AuthProvider for global auth state
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Header (to be created) */}
          {/* <Header /> */}

          {/* Main content */}
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
