import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { useAuthStore } from '@/stores/authStore';
import { setupNotifications } from '@/services/notifications/setup';
import { setupNotificationHandlers } from '@/services/notifications/handlers';
import { initializeDatabase } from '@/services/database/sqlite';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    async function init() {
      try {
        // Initialize database
        await initializeDatabase();

        // Initialize auth (checks for existing session or local user)
        await initialize();

        // Setup notifications
        await setupNotifications();

        // Setup notification handlers
        const cleanup = setupNotificationHandlers();

        // Hide splash screen
        await SplashScreen.hideAsync();

        return cleanup;
      } catch (error) {
        console.error('Initialization error:', error);
        await SplashScreen.hideAsync();
      }
    }

    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [initialize]);

  // Show nothing while loading (splash screen is visible)
  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="reminder/create"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'New Reminder',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="reminder/[id]"
          options={{
            headerShown: true,
            title: 'Reminder',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
        <Stack.Screen
          name="premium/index"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
