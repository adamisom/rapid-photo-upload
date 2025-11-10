import { useRouter } from 'expo-router';
import LoginScreen from '../../src/screens/LoginScreen';
import { useAuth } from '../../src/hooks/useAuth';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/gallery');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return null; // Show splash screen or loading
  }

  return <LoginScreen />;
}

