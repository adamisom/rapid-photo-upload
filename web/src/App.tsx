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

// Pages (to be created)
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import UploadPage from './pages/UploadPage';
// import GalleryPage from './pages/GalleryPage';
// import NotFoundPage from './pages/NotFoundPage';

// Components (to be created)
// import ProtectedRoute from './components/ProtectedRoute';
// import Header from './components/Header';

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
      {!isAuthenticated && (
        <>
          <Route path="/login" element={<div>Login Page (to be created)</div>} />
          <Route path="/register" element={<div>Register Page (to be created)</div>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </>
      )}

      {/* Protected Routes */}
      {isAuthenticated && (
        <>
          <Route path="/upload" element={<div>Upload Page (to be created)</div>} />
          <Route path="/gallery" element={<div>Gallery Page (to be created)</div>} />
          <Route path="/" element={<Navigate to="/upload" replace />} />
        </>
      )}

      {/* Fallback */}
      <Route path="*" element={<div>404 Not Found</div>} />
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
