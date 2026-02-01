import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/services/supabase/client';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++;

    if (score <= 1) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (score === 2) return { label: 'Fair', color: '#f59e0b', width: '50%' };
    if (score === 3) return { label: 'Good', color: '#22c55e', width: '75%' };
    return { label: 'Strong', color: '#10b981', width: '100%' };
  };

  const strength = getPasswordStrength(password);

  const validate = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#22c55e', '#16a34a', '#15803d']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Password Reset!</Text>
            <Text style={styles.subtitle}>Your password has been updated</Text>
          </View>

          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>

        <View style={styles.successWrapper}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={72} color="#22c55e" />
            </View>

            <Text style={styles.successTitle}>All Done!</Text>
            <Text style={styles.successText}>
              Your password has been successfully reset. You can now sign in with your new password.
            </Text>

            <Button
              onPress={() => router.replace('/(auth)/login')}
              style={styles.signInButton}
            >
              Sign In Now
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
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>Enter a strong password for your account</Text>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>

        {/* Form Container */}
        <View style={styles.formWrapper}>
          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <View style={styles.lockIcon}>
                <ShieldCheck size={32} color="#0ea5e9" />
              </View>
            </View>

            <Text style={styles.formTitle}>Set New Password</Text>
            <Text style={styles.formDescription}>
              Choose a strong password that you haven't used before.
            </Text>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                error={errors.password}
                icon={<Lock size={20} color="#64748b" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        { width: strength.width as any, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Input
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword}
                icon={<Lock size={20} color="#64748b" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsCard}>
              <Text style={styles.requirementsTitle}>Password must have:</Text>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, password.length >= 8 && styles.requirementDotActive]} />
                <Text style={[styles.requirementText, password.length >= 8 && styles.requirementTextActive]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, /[A-Z]/.test(password) && styles.requirementDotActive]} />
                <Text style={[styles.requirementText, /[A-Z]/.test(password) && styles.requirementTextActive]}>
                  One uppercase letter
                </Text>
              </View>
              <View style={styles.requirementRow}>
                <View style={[styles.requirementDot, /\d/.test(password) && styles.requirementDotActive]} />
                <Text style={[styles.requirementText, /\d/.test(password) && styles.requirementTextActive]}>
                  One number
                </Text>
              </View>
            </View>

            <Button
              onPress={handleResetPassword}
              loading={isLoading}
              style={styles.resetButton}
            >
              Reset Password
            </Button>

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>Cancel and return to Sign In</Text>
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
    fontSize: 28,
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
  lockIcon: {
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
    marginBottom: 16,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
  },
  requirementsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  requirementDotActive: {
    backgroundColor: '#22c55e',
  },
  requirementText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  requirementTextActive: {
    color: '#22c55e',
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
    fontSize: 14,
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
    shadowColor: '#22c55e',
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
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  signInButton: {
    width: '100%',
    backgroundColor: '#22c55e',
  },
});
