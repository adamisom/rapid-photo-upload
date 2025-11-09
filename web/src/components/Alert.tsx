/**
 * ============================================================================
 * ALERT COMPONENT
 * ============================================================================
 * 
 * Reusable alert for displaying error, success, and info messages
 * Used by: LoginPage, RegisterPage, and future forms
 */

import React from 'react';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  message: string;
}

const Alert: React.FC<AlertProps> = ({ type, message }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`mb-6 p-4 border rounded-lg ${styles[type]}`}>
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default Alert;

