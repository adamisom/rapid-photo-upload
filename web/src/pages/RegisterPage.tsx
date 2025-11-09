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
    <div 
      className="flex items-center justify-center p-4"
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '48px 40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#1a202c',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            RapidPhoto
          </h1>
          <p style={{ fontSize: '15px', color: '#718096' }}>
            Create your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: '#c53030'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            style={{
              width: '100%',
              backgroundColor: isLoading ? '#cbd5e0' : '#667eea',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '16px',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
            onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#5568d3')}
            onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#667eea')}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <div style={{ padding: '0 16px', fontSize: '14px', color: '#a0aec0' }}>or</div>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        {/* Login Link */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#718096' }}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            style={{ 
              color: '#667eea', 
              fontWeight: '600',
              textDecoration: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#5568d3'}
            onMouseOut={(e) => e.currentTarget.style.color = '#667eea'}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
