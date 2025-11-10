import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  // Redirect to appropriate screen based on auth state
  return <Redirect href={isAuthenticated ? '/(tabs)/gallery' : '/(auth)/login'} />;
}

