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
import Alert from '../components/Alert';
import { validators } from '../utils/validators';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    const passwordMatchError = validators.validatePasswordMatch(password, confirmPassword);
    if (passwordMatchError) {
      setError(passwordMatchError);
      return;
    }

    try {
      await register(email, password);
      navigate('/upload');
    } catch (err) {
      console.error('Registration error:', err);
      let message = 'Registration failed. Email may already exist.';
      
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
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl px-10 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">
            RapidPhotoUpload
          </h1>
          <p className="text-gray-600 text-lg">
            Create your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-red-700">
            {error}
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
