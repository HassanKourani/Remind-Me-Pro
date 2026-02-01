import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

import { useAuthStore } from '@/stores/authStore';
import { setupNotifications } from '@/services/notifications/setup';
import { setupNotificationHandlers } from '@/services/notifications/handlers';
import { initializeDatabase } from '@/services/database/sqlite';
import { initializeRevenueCat } from '@/services/purchases/revenueCat';
import { supabase } from '@/services/supabase/client';
import { initializeAds, cleanupAds } from '@/services/ads/adService';

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
  const { initialize, isAuthenticated, isLoading, syncPremiumWithRevenueCat } = useAuthStore();

  useEffect(() => {
    async function init() {
      try {
        // Initialize database
        await initializeDatabase();

        // Initialize auth (checks for existing session or local user)
        await initialize();

        // Initialize RevenueCat for in-app purchases
        try {
          await initializeRevenueCat();
          // Sync premium status with RevenueCat (validates subscription is still active)
          await syncPremiumWithRevenueCat();
        } catch (error) {
          console.log('RevenueCat initialization failed (expected in Expo Go):', error);
        }

        // Setup notifications
        await setupNotifications();

        // Setup notification handlers
        const cleanup = setupNotificationHandlers();

        // Initialize ads (for non-premium users)
        try {
          initializeAds();
        } catch (error) {
          console.log('Ads initialization failed:', error);
        }

        // Hide splash screen
        await SplashScreen.hideAsync();

        return () => {
          cleanup?.();
          cleanupAds();
        };
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

  // Handle deep links for password reset
  useEffect(() => {
    // Handle the URL when app is opened via deep link
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);

      // Check if it's a password reset link
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        // Extract tokens from the URL if present
        try {
          // Supabase will automatically handle the session from the URL
          const { data, error } = await supabase.auth.getSession();

          if (data?.session) {
            // We have a valid session from the reset link, navigate to reset password screen
            router.replace('/(auth)/reset-password');
          } else if (error) {
            console.error('Error getting session from deep link:', error);
          }
        } catch (err) {
          console.error('Deep link handling error:', err);
        }
      }
    };

    // Get the initial URL if the app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

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
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reminder/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 200,
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
