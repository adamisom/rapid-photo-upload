/**
 * ============================================================================
 * REGISTER PAGE
 * ============================================================================
 * 
 * User registration form with email/password and confirmation
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { validateRegisterForm } from '../utils/validators';
import type { ValidationError } from '../utils/validators';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [apiError, setApiError] = useState<string>('');

  const getFieldError = (field: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setApiError('');

    // Validate
    const validationErrors = validateRegisterForm(email, password, confirmPassword);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await register(email, password);
      // useAuth context handles redirect after registration
      navigate('/upload');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      // Handle specific errors
      if (message.includes('Email already exists') || message.includes('duplicate')) {
        setApiError('This email is already registered. Please login instead.');
      } else {
        setApiError(message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
          <p className="text-gray-600">Create your RapidPhotoUpload account</p>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                getFieldError('email')
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              } disabled:opacity-50`}
            />
            {getFieldError('email') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                getFieldError('password')
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              } disabled:opacity-50`}
            />
            {getFieldError('password') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                getFieldError('confirmPassword')
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              } disabled:opacity-50`}
            />
            {getFieldError('confirmPassword') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('confirmPassword')}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        {/* Login Link */}
        <Link
          to="/login"
          className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-lg text-center transition duration-200"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

