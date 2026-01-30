import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus, List, LayoutGrid, Clock, CheckCircle2, Archive } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useReminders, useActiveReminders, useCompleteReminder, useUpdateReminder, useDeleteReminder } from '@/hooks/useReminders';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { useAuthStore } from '@/stores/authStore';

type FilterType = 'all' | 'active' | 'completed';

export default function RemindersScreen() {
  const { isLoading: authLoading } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>('active');
  const { data: allReminders, isLoading: loadingAll } = useReminders();
  const { data: activeReminders, isLoading: loadingActive } = useActiveReminders();
  const completeMutation = useCompleteReminder();
  const updateMutation = useUpdateReminder();
  const deleteMutation = useDeleteReminder();

  const isLoading = filter === 'active' ? loadingActive : loadingAll;

  const reminders = React.useMemo(() => {
    if (!allReminders) return [];

    switch (filter) {
      case 'active':
        return activeReminders || [];
      case 'completed':
        return allReminders.filter(r => r.isCompleted);
      default:
        return allReminders;
    }
  }, [filter, allReminders, activeReminders]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const activeCount = activeReminders?.length || 0;
  const completedCount = allReminders?.filter(r => r.isCompleted).length || 0;
  const totalCount = allReminders?.length || 0;

  const filters: { type: FilterType; label: string; icon: typeof List; count: number }[] = [
    { type: 'active', label: 'Active', icon: Clock, count: activeCount },
    { type: 'all', label: 'All', icon: LayoutGrid, count: totalCount },
    { type: 'completed', label: 'Done', icon: CheckCircle2, count: completedCount },
  ];

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
      {/* Header */}
      <LinearGradient
        colors={['#0ea5e9', '#0284c7', '#0369a1']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>All Reminders</Text>
              <Text style={styles.headerSubtitle}>
                {totalCount} total, {activeCount} active
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Archive size={24} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatNumber}>{activeCount}</Text>
              <Text style={styles.quickStatLabel}>Active</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatNumber}>{completedCount}</Text>
              <Text style={styles.quickStatLabel}>Completed</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatNumber}>
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </Text>
              <Text style={styles.quickStatLabel}>Done</Text>
            </View>
          </View>
        </View>

        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filters.map((filterItem) => {
          const isActive = filter === filterItem.type;
          const Icon = filterItem.icon;

          return (
            <TouchableOpacity
              key={filterItem.type}
              onPress={() => setFilter(filterItem.type)}
              style={[
                styles.filterTab,
                isActive && styles.filterTabActive,
              ]}
              activeOpacity={0.7}
            >
              <Icon size={16} color={isActive ? '#ffffff' : '#64748b'} />
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {filterItem.label}
              </Text>
              <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                  {filterItem.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Hint */}
      {reminders.length > 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Tap a reminder to see details</Text>
        </View>
      )}

      {/* Reminders List */}
      {isLoading ? (
        <View style={styles.loadingList}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={reminders}
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
                <List size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No reminders found</Text>
              <Text style={styles.emptyText}>
                {filter === 'completed'
                  ? "You haven't completed any reminders yet"
                  : 'Tap the + button to create your first reminder'}
              </Text>
            </View>
          }
        />
      )}

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
  header: {
    paddingTop: 60,
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 160,
    height: 160,
    top: -40,
    right: -40,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  filterBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  filterBadgeTextActive: {
    color: '#ffffff',
  },
  hintContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  loadingList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
