import React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Cloud, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

export default function WelcomeScreen() {
  const { continueAsGuest, isLoading } = useAuthStore();

  const handleContinueAsGuest = async () => {
    await continueAsGuest();
    router.replace('/(tabs)');
  };

  const features = [
    {
      icon: Bell,
      title: 'Smart Reminders',
      description: 'Time-based notifications that work',
    },
    {
      icon: MapPin,
      title: 'Location Triggers',
      description: 'Remind at places that matter',
    },
    {
      icon: Cloud,
      title: 'Cloud Sync',
      description: 'Access anywhere, anytime',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Gradient */}
      <LinearGradient
        colors={['#0ea5e9', '#0284c7', '#0369a1']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Bell size={32} color="#0ea5e9" />
            </View>
          </View>
          <Text style={styles.title}>RemindMe Pro</Text>
          <Text style={styles.subtitle}>Never forget what matters</Text>
        </View>

        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </LinearGradient>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Why RemindMe Pro?</Text>

        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <feature.icon size={22} color="#0ea5e9" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            <CheckCircle size={20} color="#10b981" />
          </View>
        ))}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          onPress={() => router.push('/(auth)/register')}
          style={styles.primaryButton}
        >
          Get Started Free
        </Button>

        <Button
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
          style={styles.outlineButton}
        >
          I Already Have an Account
        </Button>

        <Button
          variant="ghost"
          onPress={handleContinueAsGuest}
          loading={isLoading}
          style={styles.ghostButton}
        >
          Continue as Guest
        </Button>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 192,
    height: 192,
    top: -48,
    right: -48,
  },
  decorCircle2: {
    width: 144,
    height: 144,
    bottom: -32,
    left: -32,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    top: 40,
    left: 20,
  },
  featuresSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    marginLeft: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  primaryButton: {
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineButton: {
    marginBottom: 12,
  },
  ghostButton: {
    marginBottom: 8,
  },
  termsContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
