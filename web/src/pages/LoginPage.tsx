/**
 * ============================================================================
 * LOGIN PAGE
 * ============================================================================
 * 
 * Authentication page for existing users to sign in with email + password
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FormInput from '../components/FormInput';
import Alert from '../components/Alert';
import { validators } from '../utils/validators';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    try {
      await login(email, password);
      navigate('/upload');
    } catch (err) {
      console.error('Login error:', err);
      let message = 'Login failed. Please check your credentials.';
      
      if (err instanceof Error) {
        message = err.message;
      }
      
      // Check for network errors
      if (message.includes('Failed to fetch') || message.includes('Network')) {
        message = 'Cannot connect to server. Is the backend running on http://localhost:8080?';
      }
      
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RapidPhoto</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Error Message */}
        {error && <Alert type="error" message={error} />}

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
            autoComplete="current-password"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <div className="px-3 text-sm text-gray-600">or</div>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Register Link */}
        <p className="text-center text-gray-600 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
