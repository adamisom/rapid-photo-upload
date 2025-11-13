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
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UploadPage from './pages/UploadPage';
import GalleryPage from './pages/GalleryPage';

// Placeholder pages (to be created in later phases)
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
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Header />
      <Routes>
        {/* Public Routes */}
            <Route path="/login" element={
              <ErrorBoundary>
                <LoginPage />
              </ErrorBoundary>
            } />
            <Route path="/register" element={
              <ErrorBoundary>
                <RegisterPage />
              </ErrorBoundary>
            } />

            {/* Protected Routes */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <UploadPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <GalleryPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/upload" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
