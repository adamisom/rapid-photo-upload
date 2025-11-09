import { redirect } from 'expo-router';
import LoginScreen from '../../src/screens/LoginScreen';
import { useAuth } from '../../src/hooks/useAuth';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show splash screen or loading
  }

  if (isAuthenticated) {
    redirect('/(tabs)');
  }

  return <LoginScreen />;
}

