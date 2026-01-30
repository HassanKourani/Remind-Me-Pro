import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus, Calendar, Clock, Bell, CheckCircle2, Sparkles, TrendingUp, Wifi, WifiOff, CloudOff, UserPlus } from 'lucide-react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

import { useTodayReminders, useCompleteReminder, useUpdateReminder, useDeleteReminder } from '@/hooks/useReminders';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { useAuthStore } from '@/stores/authStore';

export default function TodayScreen() {
  const { isLoading: authLoading, user, isConnected } = useAuthStore();
  const { data: reminders, isLoading } = useTodayReminders();
  const completeMutation = useCompleteReminder();
  const updateMutation = useUpdateReminder();
  const deleteMutation = useDeleteReminder();

  if (authLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const completedCount = reminders?.filter(r => r.isCompleted).length || 0;
  const totalCount = reminders?.length || 0;
  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSnooze = (reminderId: string, minutes: number) => {
    const reminder = reminders?.find(r => r.id === reminderId);
    if (!reminder?.triggerAt) return;

    const newTriggerAt = new Date(new Date().getTime() + minutes * 60 * 1000).toISOString();
    updateMutation.mutate(
      { id: reminderId, data: { triggerAt: newTriggerAt } },
      {
        onSuccess: () => {
          Alert.alert('Snoozed', `Reminder snoozed for ${minutes} minutes`);
        },
      }
    );
  };

  const handleDelete = (reminderId: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(reminderId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Guest Banner */}
      {user?.isGuest && (
        <TouchableOpacity
          style={styles.guestBanner}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <View style={styles.guestBannerContent}>
            <CloudOff size={18} color="#f59e0b" />
            <Text style={styles.guestBannerText}>
              Guest mode - Data stored locally only
            </Text>
          </View>
          <View style={styles.guestBannerAction}>
            <UserPlus size={16} color="#0ea5e9" />
            <Text style={styles.guestBannerActionText}>Create Account</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Header with Gradient */}
      <LinearGradient
        colors={['#0ea5e9', '#0284c7', '#0369a1']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>
                  {getGreeting()}, {user?.isGuest ? 'there' : user?.displayName?.split(' ')[0] || 'there'}!
                </Text>
                <Sparkles size={20} color="#fbbf24" style={styles.sparkle} />
              </View>
              <Text style={styles.date}>
                {format(new Date(), 'EEEE, MMMM d')}
              </Text>
            </View>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.isGuest ? 'G' : user?.displayName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              {/* Connection indicator */}
              <View style={[styles.connectionBadge, !isConnected && styles.connectionBadgeOffline]}>
                {isConnected ? (
                  <Wifi size={10} color="#22c55e" />
                ) : (
                  <WifiOff size={10} color="#ef4444" />
                )}
              </View>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e0f2fe' }]}>
                <Calendar size={18} color="#0ea5e9" />
              </View>
              <Text style={styles.statNumber}>{totalCount}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
                <CheckCircle2 size={18} color="#22c55e" />
              </View>
              <Text style={styles.statNumber}>{completedCount}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Clock size={18} color="#f59e0b" />
              </View>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          {/* Progress bar */}
          {totalCount > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <View style={styles.progressLabelRow}>
                  <TrendingUp size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.progressLabel}>Today's Progress</Text>
                </View>
                <Text style={styles.progressPercent}>{completionRate}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
              </View>
            </View>
          )}
        </View>

        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
      </LinearGradient>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Reminders</Text>
        {totalCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalCount}</Text>
          </View>
        )}
      </View>

      {/* Swipe hint */}
      {totalCount > 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Tap a reminder to see details</Text>
        </View>
      )}

      {/* Reminders List */}
      <FlatList
        data={reminders || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onPress={() => router.push(`/reminder/${item.id}`)}
            onComplete={() => completeMutation.mutate(item.id)}
            onSnooze={(minutes) => handleSnooze(item.id, minutes)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Bell size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No reminders for today</Text>
            <Text style={styles.emptyText}>
              Tap the + button to create your first reminder
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/reminder/create')}
        style={styles.fabContainer}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#0ea5e9', '#0284c7']}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Plus size={28} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  guestBanner: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  guestBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestBannerText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '500',
  },
  guestBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guestBannerActionText: {
    color: '#0ea5e9',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerContent: {
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  sparkle: {
    marginLeft: 8,
  },
  date: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  connectionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  connectionBadgeOffline: {
    borderColor: '#ef4444',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  progressPercent: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 176,
    height: 176,
    top: -40,
    right: -40,
  },
  decorCircle2: {
    width: 112,
    height: 112,
    bottom: -20,
    left: -20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  badge: {
    marginLeft: 10,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  hintContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  hintText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
