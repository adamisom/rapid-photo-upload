import { useRouter } from 'expo-router';
import RegisterScreen from '../../src/screens/RegisterScreen';
import { useAuth } from '../../src/hooks/useAuth';
import { useEffect } from 'react';

export default function RegisterPage() {
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

  return <RegisterScreen />;
}

