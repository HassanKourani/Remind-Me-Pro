import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/services/supabase/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError(null);
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'remindme://reset-password', // Deep link for password reset
      });

      if (resetError) {
        throw resetError;
      }

      setIsEmailSent(true);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0ea5e9', '#0284c7', '#0369a1']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>We've sent you a password reset link</Text>
          </View>

          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>

        <View style={styles.successWrapper}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={64} color="#22c55e" />
            </View>

            <Text style={styles.successTitle}>Email Sent!</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <Text style={styles.instructionText}>
              Check your email and click the link to reset your password. The link will expire in 24 hours.
            </Text>

            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Didn't receive the email?</Text>
              <Text style={styles.tipsText}>• Check your spam or junk folder</Text>
              <Text style={styles.tipsText}>• Make sure the email address is correct</Text>
              <Text style={styles.tipsText}>• Wait a few minutes and try again</Text>
            </View>

            <Button
              onPress={() => {
                setIsEmailSent(false);
                setEmail('');
              }}
              variant="secondary"
              style={styles.tryAgainButton}
            >
              Try Different Email
            </Button>

            <Button
              onPress={() => router.replace('/(auth)/login')}
              style={styles.backToLoginButton}
            >
              Back to Sign In
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#0ea5e9', '#0284c7', '#0369a1']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email to reset your password</Text>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>

        {/* Form Container */}
        <View style={styles.formWrapper}>
          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <View style={styles.mailIcon}>
                <Mail size={32} color="#0ea5e9" />
              </View>
            </View>

            <Text style={styles.formTitle}>Reset Your Password</Text>
            <Text style={styles.formDescription}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </Text>

            <View style={styles.inputGroup}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={error || undefined}
                icon={<Mail size={20} color="#64748b" />}
              />
            </View>

            <Button
              onPress={handleResetPassword}
              loading={isLoading}
              style={styles.resetButton}
            >
              Send Reset Link
            </Button>

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerContent: {
    zIndex: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
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
    top: -64,
    right: -64,
  },
  decorCircle2: {
    width: 112,
    height: 112,
    bottom: -32,
    left: -32,
  },
  formWrapper: {
    flex: 1,
    padding: 20,
    marginTop: -20,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mailIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  resetButton: {
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backLinkText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  // Success state styles
  successWrapper: {
    flex: 1,
    padding: 20,
    marginTop: -20,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  emailHighlight: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  tipsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  tryAgainButton: {
    width: '100%',
    marginBottom: 12,
  },
  backToLoginButton: {
    width: '100%',
  },
});
