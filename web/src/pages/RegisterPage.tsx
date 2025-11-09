/**
 * ============================================================================
 * REGISTER PAGE
 * ============================================================================
 * 
 * Account creation page for new users
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FormInput from '../components/FormInput';
import { validators } from '../utils/validators';
import { authService } from '../services/authService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    // Validation
    const emailError = validators.validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validators.validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const passwordMatchError = validators.validatePasswordMatch(password, confirmPassword);
    if (passwordMatchError) {
      setError(passwordMatchError);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.register(email, password);
      authService.setAuthToken(response.token, response.userId, response.email);
      refreshAuth(); // Tell AuthContext to refresh from localStorage
      navigate('/upload');
    } catch (err: any) {
      let message = 'Registration failed. Please try again.';
      
      // Extract message from axios error structure
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.response?.data) {
        message = typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
      } else if (err.message) {
        message = err.message;
      }
      
      // Check for specific cases
      if (message.includes('Email already exists') || message.includes('already exists')) {
        setInfo('This email is already registered. Please login instead.');
      } else if (message.includes('Failed to fetch') || message.includes('Network') || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Is the backend running on http://localhost:8080?');
      } else if (err.response?.status === 400) {
        setError(message || 'Invalid email or password. Password must be at least 8 characters.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl px-10 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            RapidPhotoUpload
          </h1>
          <p className="text-gray-600 text-lg">
            Create your account
          </p>
        </div>

        {/* Info Message - Email Already Exists */}
        {info && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-blue-800">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p>{info}</p>
                <Link 
                  to="/login" 
                  className="text-purple-600 hover:text-purple-700 font-semibold underline mt-2 inline-block"
                >
                  Go to login →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-700">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormInput
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={isLoading}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <FormInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            disabled={isLoading}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <FormInput
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={isLoading}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold text-lg py-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50 mt-6"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-8">
          <div className="flex-1 border-t border-gray-300"></div>
          <div className="px-5 text-sm text-gray-500">or</div>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Login Link */}
        <p className="text-center text-base text-gray-600">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-purple-600 hover:text-purple-700 font-semibold no-underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
