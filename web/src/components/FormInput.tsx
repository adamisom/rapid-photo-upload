/**
 * ============================================================================
 * FORM INPUT COMPONENT
 * ============================================================================
 * 
 * Reusable form input with label, error display, and consistent styling
 * Used by: LoginPage, RegisterPage, and future forms
 */

import React from 'react';

interface FormInputProps {
  label: string;
  type: 'text' | 'email' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string | null;
  autoComplete?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type,
  value,
  onChange,
  disabled = false,
  placeholder = '',
  error = null,
  autoComplete,
}) => {
  return (
    <div>
      <label 
        htmlFor={label} 
        style={{ 
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#4a5568',
          marginBottom: '8px'
        }}
      >
        {label}
      </label>
      <input
        id={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '15px',
          border: '2px solid #e2e8f0',
          borderRadius: '10px',
          backgroundColor: disabled ? '#f7fafc' : '#ffffff',
          color: '#2d3748',
          outline: 'none',
          transition: 'all 0.2s ease',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#667eea';
          e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e2e8f0';
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && (
        <p style={{ color: '#e53e3e', fontSize: '12px', marginTop: '6px' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;

