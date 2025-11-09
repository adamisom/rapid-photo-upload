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
        className="block text-sm font-semibold text-gray-700 mb-2"
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
        className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-50 disabled:cursor-not-allowed outline-none transition-all duration-200"
      />
      {error && (
        <p className="text-red-600 text-xs mt-2">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;

