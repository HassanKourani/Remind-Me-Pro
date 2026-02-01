import { Redirect, Tabs } from 'expo-router';
import { Home, List, Settings } from 'lucide-react-native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#f8f8f8',
          borderTopWidth: 0.5,
          borderTopColor: '#d1d1d6',
          height: 52 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Home size={20} color={focused ? '#0ea5e9' : color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <List size={20} color={focused ? '#0ea5e9' : color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Settings size={20} color={focused ? '#0ea5e9' : color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  iconWrapper: {
    width: 48,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
});
