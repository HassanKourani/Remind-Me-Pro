import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Switch, Linking } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Crown, Info, ChevronRight, LogOut, Cloud, Shield, UserPlus, Wifi, WifiOff, CloudOff, X, Mail, Lock, User, Smartphone, Volume2, Vibrate, Clock, RefreshCw, Trash2, Database, Eye, Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function SettingsScreen() {
  const { user, signOut, isConnected, linkGuestToAccount, isLoading } = useAuthStore();
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createAccountError, setCreateAccountError] = useState('');

  // Permission states
  const [notificationPermission, setNotificationPermission] = useState<string>('undetermined');
  const [locationPermission, setLocationPermission] = useState<string>('undetermined');
  const [backgroundLocationPermission, setBackgroundLocationPermission] = useState<string>('undetermined');

  const isGuest = user?.isGuest ?? false;

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Check notification permission
      const notifStatus = await Notifications.getPermissionsAsync();
      setNotificationPermission(notifStatus.status);
    } catch (error) {
      console.log('Notification permission check error:', error);
    }

    try {
      // Check location permission
      const locStatus = await Location.getForegroundPermissionsAsync();
      setLocationPermission(locStatus.status);

      // Check background location permission
      const bgLocStatus = await Location.getBackgroundPermissionsAsync();
      setBackgroundLocationPermission(bgLocStatus.status);
    } catch (error) {
      console.log('Location permission check error:', error);
      // This can fail in Expo Go - requires development build
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationPermission(status);

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To receive reminders, please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.log('Notification permission request error:', error);
      Alert.alert('Error', 'Could not request notification permission. Please enable in Settings.');
      Linking.openSettings();
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        // Also request background location for location-based reminders
        try {
          const bgStatus = await Location.requestBackgroundPermissionsAsync();
          setBackgroundLocationPermission(bgStatus.status);

          if (bgStatus.status !== 'granted') {
            Alert.alert(
              'Background Location',
              'For location-based reminders to work when the app is closed, please enable "Always" location access in settings.',
              [
                { text: 'Later', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
        } catch (bgError) {
          console.log('Background location permission error:', bgError);
          // Background location may not be available in Expo Go
        }
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is needed for location-based reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.log('Location permission request error:', error);
      Alert.alert(
        'Development Build Required',
        'Location permissions require a development build. In Expo Go, please open Settings to grant permissions manually.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const getPermissionStatus = (status: string) => {
    switch (status) {
      case 'granted':
        return { label: 'Enabled', color: '#22c55e' };
      case 'denied':
        return { label: 'Denied', color: '#ef4444' };
      default:
        return { label: 'Not Set', color: '#f59e0b' };
    }
  };

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

  const notifStatus = getPermissionStatus(notificationPermission);
  const locStatus = getPermissionStatus(locationPermission);
  const bgLocStatus = getPermissionStatus(backgroundLocationPermission);

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
    // Premium section (only show if not premium)
    ...(!user?.isPremium
      ? [
          {
            title: 'Premium',
            items: [
              {
                icon: Crown,
                label: 'Upgrade to Premium',
                description: 'Unlock location reminders & more',
                onPress: () => router.push('/premium'),
                color: '#f59e0b',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: notifStatus.label,
          descriptionColor: notifStatus.color,
          onPress: requestNotificationPermission,
          color: '#0ea5e9',
          showStatus: true,
          statusEnabled: notificationPermission === 'granted',
        },
        {
          icon: Volume2,
          label: 'Sound & Vibration',
          description: 'Customize alert sounds',
          onPress: () => Linking.openSettings(),
          color: '#8b5cf6',
        },
      ],
    },
    {
      title: 'Location',
      items: [
        {
          icon: MapPin,
          label: 'Location Access',
          description: locStatus.label,
          descriptionColor: locStatus.color,
          onPress: requestLocationPermission,
          color: '#10b981',
          showStatus: true,
          statusEnabled: locationPermission === 'granted',
        },
        {
          icon: Smartphone,
          label: 'Background Location',
          description: backgroundLocationPermission === 'granted'
            ? 'Enabled - Always on'
            : 'Required for location reminders',
          descriptionColor: bgLocStatus.color,
          onPress: () => {
            if (locationPermission !== 'granted') {
              Alert.alert('Enable Location First', 'Please enable location access before setting up background location.');
            } else {
              Alert.alert(
                'Background Location',
                'Background location allows reminders to trigger when you arrive at or leave a location, even when the app is closed.\n\nNote: This feature requires a production build of the app. In Expo Go, please enable location in device Settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ]
              );
            }
          },
          color: '#06b6d4',
          showStatus: true,
          statusEnabled: backgroundLocationPermission === 'granted',
        },
      ],
    },
    // Non-guest account section
    ...(!isGuest
      ? [
          {
            title: 'Cloud & Sync',
            items: [
              {
                icon: Cloud,
                label: isConnected ? 'Cloud Sync Active' : 'Cloud Sync Paused',
                description: isConnected ? 'Your data syncs automatically' : 'Will sync when connected',
                onPress: () => {
                  Alert.alert(
                    isConnected ? 'Cloud Sync Active' : 'Offline Mode',
                    isConnected
                      ? 'Your reminders are synced to the cloud in real-time. Changes you make are automatically backed up.'
                      : 'You are currently offline. Any changes will be saved locally and synced automatically when you reconnect.'
                  );
                },
                color: isConnected ? '#10b981' : '#64748b',
                showStatus: true,
                statusEnabled: isConnected,
              },
              {
                icon: RefreshCw,
                label: 'Last Synced',
                description: isConnected ? 'Just now' : 'Waiting for connection',
                onPress: () => {
                  if (isConnected) {
                    Alert.alert('Sync Status', 'All your data is up to date with the cloud.');
                  } else {
                    Alert.alert('Offline', 'Your data will sync when you reconnect to the internet.');
                  }
                },
                color: '#64748b',
              },
            ],
          },
          {
            title: 'Privacy & Data',
            items: [
              {
                icon: Database,
                label: 'Your Data',
                description: 'Stored securely in Supabase',
                onPress: () => {
                  Alert.alert(
                    'Data Storage',
                    'Your reminders are stored securely using Supabase with end-to-end encryption. Only you can access your data.',
                    [{ text: 'Got it' }]
                  );
                },
                color: '#8b5cf6',
              },
              {
                icon: Download,
                label: 'Export Data',
                description: 'Download your reminders',
                onPress: () => {
                  Alert.alert(
                    'Export Data',
                    'Would you like to export all your reminders as a JSON file?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Export', onPress: () => Alert.alert('Coming Soon', 'Data export will be available in the next update.') },
                    ]
                  );
                },
                color: '#0ea5e9',
              },
              {
                icon: Trash2,
                label: 'Delete Account',
                description: 'Permanently remove all data',
                onPress: () => {
                  Alert.alert(
                    'Delete Account',
                    'This will permanently delete your account and all associated data. This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available in settings.'),
                      },
                    ]
                  );
                },
                color: '#ef4444',
              },
            ],
          },
        ]
      : []),
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'RemindMe Pro',
          description: 'Version 1.0.0',
          onPress: () =>
            Alert.alert(
              'RemindMe Pro',
              'Version 1.0.0\n\nA smart reminder app that helps you never forget anything important.\n\nBuilt with Expo, React Native, and Supabase.'
            ),
          color: '#64748b',
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          description: 'How we protect your data',
          onPress: () => router.push('/legal/privacy'),
          color: '#0ea5e9',
        },
        {
          icon: Info,
          label: 'Terms of Service',
          description: 'Usage terms and conditions',
          onPress: () => router.push('/legal/terms'),
          color: '#8b5cf6',
        },
      ],
    },
  ];

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header with User Profile */}
        <LinearGradient
          colors={user?.isPremium ? ['#f59e0b', '#d97706', '#b45309'] : ['#0ea5e9', '#0284c7', '#0369a1']}
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
                {section.items.map((item, itemIndex) => {
                  const itemData = item as any;
                  return (
                    <TouchableOpacity
                      key={itemIndex}
                      onPress={item.onPress}
                      style={[
                        styles.settingsItem,
                        itemIndex !== section.items.length - 1 && styles.settingsItemBorder,
                        itemData.highlight && styles.settingsItemHighlight,
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.settingsItemIcon, { backgroundColor: `${item.color}15` }]}>
                        <item.icon size={20} color={item.color} />
                      </View>
                      <View style={styles.settingsItemContent}>
                        <Text style={styles.settingsItemLabel}>{item.label}</Text>
                        <Text style={[
                          styles.settingsItemDescription,
                          itemData.descriptionColor && { color: itemData.descriptionColor }
                        ]}>
                          {item.description}
                        </Text>
                      </View>
                      {itemData.showStatus ? (
                        <View style={[
                          styles.statusIndicator,
                          itemData.statusEnabled ? styles.statusEnabled : styles.statusDisabled
                        ]}>
                          <Text style={[
                            styles.statusText,
                            itemData.statusEnabled ? styles.statusTextEnabled : styles.statusTextDisabled
                          ]}>
                            {itemData.statusEnabled ? 'ON' : 'OFF'}
                          </Text>
                        </View>
                      ) : (
                        <ChevronRight size={20} color="#cbd5e1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
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
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  statusEnabled: {
    backgroundColor: '#dcfce7',
  },
  statusDisabled: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextEnabled: {
    color: '#16a34a',
  },
  statusTextDisabled: {
    color: '#94a3b8',
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
