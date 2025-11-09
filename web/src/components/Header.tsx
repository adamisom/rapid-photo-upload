/**
 * ============================================================================
 * HEADER / NAVIGATION
 * ============================================================================
 * 
 * Top navigation bar with user info and logout
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string): boolean => location.pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link to="/upload" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">📸</span>
          </div>
          <span className="text-xl font-bold text-gray-900 hidden sm:inline">RapidPhotoUpload</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-8">
          <Link
            to="/upload"
            className={`font-medium transition ${
              isActive('/upload')
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upload
          </Link>
          <Link
            to="/gallery"
            className={`font-medium transition ${
              isActive('/gallery')
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Gallery
          </Link>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {/* User Email */}
          <div className="hidden sm:block text-right">
            <p className="text-sm text-gray-600">Logged in as</p>
            <p className="font-semibold text-gray-900 truncate">{user?.email}</p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}

