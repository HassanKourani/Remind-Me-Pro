import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Crown, Info, ChevronRight, LogOut, Cloud, Shield, Star, UserPlus, Wifi, WifiOff, CloudOff, X, Mail, Lock, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function SettingsScreen() {
  const { user, signOut, isConnected, linkGuestToAccount, isLoading } = useAuthStore();
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createAccountError, setCreateAccountError] = useState('');

  const isGuest = user?.isGuest ?? false;

  const handleSignOut = () => {
    Alert.alert(
      isGuest ? 'Leave Guest Mode' : 'Sign Out',
      isGuest
        ? 'Your local data will be preserved. You can sign back in as guest later.'
        : 'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isGuest ? 'Leave' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCreateAccount = async () => {
    if (!email || !password || !displayName) {
      setCreateAccountError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setCreateAccountError('Password must be at least 6 characters');
      return;
    }

    try {
      setCreateAccountError('');
      await linkGuestToAccount(email, password, displayName);
      setShowCreateAccountModal(false);
      Alert.alert(
        'Account Created!',
        'Your data has been linked to your new account and will sync to the cloud.',
        [{ text: 'Great!' }]
      );
    } catch (error: any) {
      setCreateAccountError(error.message || 'Failed to create account');
    }
  };

  const settingsSections = [
    // Guest-specific section
    ...(isGuest
      ? [
          {
            title: 'Account',
            items: [
              {
                icon: UserPlus,
                label: 'Create Account',
                description: 'Backup your data to the cloud',
                onPress: () => setShowCreateAccountModal(true),
                color: '#0ea5e9',
                highlight: true,
              },
              {
                icon: CloudOff,
                label: 'Guest Mode Active',
                description: 'Data stored locally only',
                onPress: () =>
                  Alert.alert(
                    'Guest Mode',
                    'Your reminders are stored locally on this device. Create an account to backup your data to the cloud and access it from anywhere.'
                  ),
                color: '#f59e0b',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Premium',
      items: [
        {
          icon: Crown,
          label: 'Upgrade to Premium',
          description: 'Unlock all features',
          onPress: () => router.push('/premium'),
          color: '#f59e0b',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          label: 'Notification Settings',
          description: 'Manage notification preferences',
          onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon.'),
          color: '#0ea5e9',
        },
        {
          icon: MapPin,
          label: 'Location Permissions',
          description: 'Manage location access',
          onPress: () => Alert.alert('Coming Soon', 'Location settings will be available soon.'),
          color: '#10b981',
        },
      ],
    },
    // Non-guest account section
    ...(!isGuest
      ? [
          {
            title: 'Account',
            items: [
              {
                icon: Cloud,
                label: isConnected ? 'Cloud Sync Active' : 'Cloud Sync Paused',
                description: isConnected ? 'Your data syncs automatically' : 'Will sync when connected',
                onPress: () => {
                  Alert.alert(
                    isConnected ? 'Cloud Sync Active' : 'Offline Mode',
                    isConnected
                      ? 'Your reminders are being synced to the cloud.'
                      : 'You are offline. Your changes will sync when you reconnect.'
                  );
                },
                color: isConnected ? '#10b981' : '#64748b',
              },
              {
                icon: Shield,
                label: 'Privacy & Security',
                description: 'Manage your data preferences',
                onPress: () => Alert.alert('Coming Soon', 'Privacy settings will be available soon.'),
                color: '#8b5cf6',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Support',
      items: [
        {
          icon: Star,
          label: 'Rate the App',
          description: 'Help us improve with your feedback',
          onPress: () => Alert.alert('Thank You!', 'Rating feature coming soon.'),
          color: '#f59e0b',
        },
        {
          icon: Info,
          label: 'About RemindMe Pro',
          description: 'Version 1.0.0',
          onPress: () =>
            Alert.alert(
              'RemindMe Pro',
              'Version 1.0.0\n\nA smart reminder app that helps you never forget anything important.'
            ),
          color: '#64748b',
        },
      ],
    },
  ];

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with User Profile */}
        <LinearGradient
          colors={isGuest ? ['#f59e0b', '#d97706', '#b45309'] : ['#0ea5e9', '#0284c7', '#0369a1']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            {/* Connection status indicator */}
            <View style={styles.connectionStatus}>
              {isConnected ? (
                <>
                  <Wifi size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.connectionStatusText}>Online</Text>
                </>
              ) : (
                <>
                  <WifiOff size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.connectionStatusText}>Offline</Text>
                </>
              )}
            </View>

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{isGuest ? 'G' : user?.displayName?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <Text style={styles.userName}>{isGuest ? 'Guest User' : user?.displayName || 'User'}</Text>
            <Text style={styles.userEmail}>
              {isGuest ? 'No account - local data only' : user?.email || 'Signed In'}
            </Text>
            <View style={[styles.planBadge, isGuest && styles.guestBadge]}>
              <Text style={styles.planBadgeText}>
                {isGuest ? 'Guest Mode' : user?.isPremium ? 'Premium Member' : 'Free Plan'}
              </Text>
            </View>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
        </LinearGradient>

        {/* Settings Sections */}
        <View style={styles.sectionsContainer}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    onPress={item.onPress}
                    style={[
                      styles.settingsItem,
                      itemIndex !== section.items.length - 1 && styles.settingsItemBorder,
                      (item as any).highlight && styles.settingsItemHighlight,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingsItemIcon, { backgroundColor: `${item.color}15` }]}>
                      <item.icon size={20} color={item.color} />
                    </View>
                    <View style={styles.settingsItemContent}>
                      <Text style={styles.settingsItemLabel}>{item.label}</Text>
                      <Text style={styles.settingsItemDescription}>{item.description}</Text>
                    </View>
                    <ChevronRight size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Sign Out Button */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton} activeOpacity={0.7}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.signOutText}>{isGuest ? 'Leave Guest Mode' : 'Sign Out'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Made with care for productivity</Text>
          </View>
        </View>
      </ScrollView>

      {/* Create Account Modal */}
      <Modal visible={showCreateAccountModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Account</Text>
              <TouchableOpacity onPress={() => setShowCreateAccountModal(false)} style={styles.modalClose}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Your existing reminders will be linked to your new account and synced to the cloud.
            </Text>

            {createAccountError ? <Text style={styles.errorText}>{createAccountError}</Text> : null}

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <User size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Mail size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Button onPress={handleCreateAccount} loading={isLoading} style={styles.createButton}>
              Create Account & Sync Data
            </Button>

            <TouchableOpacity onPress={() => setShowCreateAccountModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 70,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  connectionStatusText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  guestBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  planBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 144,
    height: 144,
    top: -32,
    right: -32,
  },
  decorCircle2: {
    width: 96,
    height: 96,
    bottom: -20,
    left: -20,
  },
  sectionsContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingsItemHighlight: {
    backgroundColor: '#f0f9ff',
  },
  settingsItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  settingsItemDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 10,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
  },
  inputContainer: {
    gap: 12,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  createButton: {
    marginBottom: 12,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
});
