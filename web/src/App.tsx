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
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Placeholder pages (to be created in later phases)
const UploadPage = () => <div className="p-8">Upload Page (Phase 4.2)</div>;
const GalleryPage = () => <div className="p-8">Gallery Page (Phase 5)</div>;
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <a href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
        Go home
      </a>
    </div>
  </div>
);

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
    <>
      <Header />
      <Routes>
        {/* Public Routes */}
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {/* Protected Routes */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <GalleryPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </>
        )}
      </Routes>
    </>
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
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
