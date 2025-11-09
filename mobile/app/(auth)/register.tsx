import { redirect } from 'expo-router';
import RegisterScreen from '../../src/screens/RegisterScreen';
import { useAuth } from '../../src/hooks/useAuth';

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show splash screen or loading
  }

  if (isAuthenticated) {
    redirect('/(tabs)');
  }

  return <RegisterScreen />;
}

