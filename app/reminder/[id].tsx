import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Clock, MapPin, Bell, Trash2, Check, RotateCcw, Calendar, AlertCircle, Repeat, Pencil, X, ChevronDown } from 'lucide-react-native';
import { format, isPast } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useReminder, useCompleteReminder, useDeleteReminder, useUpdateReminder } from '@/hooks/useReminders';

// Delivery icons and labels hidden for V1
// TODO: Re-enable when alarm and share are implemented

const priorityConfig = {
  low: { variant: 'success' as const, label: 'Low Priority', color: '#22c55e' },
  medium: { variant: 'warning' as const, label: 'Medium Priority', color: '#f59e0b' },
  high: { variant: 'danger' as const, label: 'High Priority', color: '#ef4444' },
};

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: reminder, isLoading, error } = useReminder(id);
  const completeMutation = useCompleteReminder();
  const deleteMutation = useDeleteReminder();
  const updateMutation = useUpdateReminder();

  // Edit modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editDate, setEditDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  // Initialize edit form when reminder loads
  useEffect(() => {
    if (reminder) {
      setEditTitle(reminder.title);
      setEditNotes(reminder.notes || '');
      setEditPriority(reminder.priority);
      if (reminder.triggerAt) {
        setEditDate(new Date(reminder.triggerAt));
      }
    }
  }, [reminder]);

  const handleComplete = () => {
    if (!reminder) return;

    Alert.alert(
      'Complete Reminder',
      'Mark this reminder as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            await completeMutation.mutateAsync(reminder.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleSnooze = (minutes: number) => {
    if (!reminder) return;

    const newTriggerAt = new Date();
    newTriggerAt.setMinutes(newTriggerAt.getMinutes() + minutes);

    Alert.alert(
      'Snooze Reminder',
      `Snooze for ${minutes} minutes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Snooze',
          onPress: async () => {
            await updateMutation.mutateAsync({
              id: reminder.id,
              data: { triggerAt: newTriggerAt.toISOString() },
            });
          },
        },
      ]
    );
  };

  const handleReactivate = () => {
    if (!reminder) return;

    Alert.alert(
      'Reactivate Reminder',
      'Reactivate this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            await updateMutation.mutateAsync({
              id: reminder.id,
              data: { isCompleted: false, isActive: true },
            });
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!reminder) return;

    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync(reminder.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleOpenEditModal = () => {
    if (reminder) {
      setEditTitle(reminder.title);
      setEditNotes(reminder.notes || '');
      setEditPriority(reminder.priority);
      if (reminder.triggerAt) {
        setEditDate(new Date(reminder.triggerAt));
      }
      setIsEditModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!reminder) return;

    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    try {
      const updateData: any = {
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        priority: editPriority,
      };

      // Only update triggerAt for time-based reminders
      if (reminder.type === 'time') {
        updateData.triggerAt = editDate.toISOString();
      }

      await updateMutation.mutateAsync({
        id: reminder.id,
        data: updateData,
      });

      setIsEditModalVisible(false);
      Alert.alert('Success', 'Reminder updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(editDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setEditDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(editDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEditDate(newDate);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error || !reminder) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <AlertCircle size={48} color="#cbd5e1" />
        </View>
        <Text style={styles.errorTitle}>Reminder not found</Text>
        <Text style={styles.errorText}>This reminder may have been deleted</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 20 }}>Go Back</Button>
      </View>
    );
  }

  const priority = priorityConfig[reminder.priority];
  const isOverdue = reminder.triggerAt && isPast(new Date(reminder.triggerAt)) && !reminder.isCompleted;

  return (
    <>
      <StatusBar style="light" />

      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={reminder.isCompleted ? ['#22c55e', '#16a34a', '#15803d'] : ['#0ea5e9', '#0284c7', '#0369a1']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Back, Edit, and Delete buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <Text style={styles.headerButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                onPress={handleOpenEditModal}
                style={[styles.headerButton, styles.editButton]}
                activeOpacity={0.7}
              >
                <Pencil size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.headerButton, styles.deleteButton]}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status */}
          <View style={styles.headerContent}>
            {reminder.isCompleted ? (
              <View style={styles.completedBadge}>
                <Check size={16} color="#22c55e" />
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            ) : isOverdue ? (
              <View style={styles.overdueBadge}>
                <AlertCircle size={16} color="#ef4444" />
                <Text style={styles.overdueBadgeText}>Overdue</Text>
              </View>
            ) : (
              <View style={styles.activeBadge}>
                <Bell size={16} color="#0ea5e9" />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}

            <Text style={styles.title} numberOfLines={3}>{reminder.title}</Text>

            {reminder.notes && (
              <Text style={styles.notes} numberOfLines={2}>{reminder.notes}</Text>
            )}
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} pointerEvents="none" />
          <View style={[styles.decorCircle, styles.decorCircle2]} pointerEvents="none" />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Priority & Tags */}
          <View style={styles.tagsRow}>
            <Badge variant={priority.variant}>{priority.label}</Badge>
            {(reminder.recurrenceRule || reminder.isRecurringLocation) && (
              <Badge variant="success">
                <View style={styles.badgeContent}>
                  <Repeat size={12} color="#16a34a" />
                  <Text style={styles.badgeText}> Recurring</Text>
                </View>
              </Badge>
            )}
          </View>

          {/* Time/Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: reminder.type === 'time' ? '#e0f2fe' : '#f3e8ff' }]}>
                {reminder.type === 'time' ? (
                  <Clock size={24} color="#0ea5e9" />
                ) : (
                  <MapPin size={24} color="#8b5cf6" />
                )}
              </View>
              <Text style={styles.cardTitle}>
                {reminder.type === 'time' ? 'Scheduled Time' : 'Location Trigger'}
              </Text>
            </View>

            {reminder.type === 'time' && reminder.triggerAt && (
              <View style={styles.timeDisplay}>
                <View style={styles.dateRow}>
                  <Calendar size={18} color="#64748b" />
                  <Text style={styles.dateText}>
                    {format(new Date(reminder.triggerAt), 'EEEE, MMMM d, yyyy')}
                  </Text>
                </View>
                <Text style={styles.timeText}>
                  {format(new Date(reminder.triggerAt), 'h:mm a')}
                </Text>
              </View>
            )}

            {reminder.type === 'location' && (
              <View style={styles.locationDisplay}>
                <Text style={styles.locationName}>
                  {reminder.locationName || 'Unknown Location'}
                </Text>
                <View style={styles.locationMeta}>
                  <Text style={styles.locationDetail}>
                    Trigger: {reminder.triggerOn === 'both' ? 'Enter & Exit' : reminder.triggerOn}
                  </Text>
                  <Text style={styles.locationDetail}>
                    Radius: {reminder.radius}m
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Delivery Method Card - Hidden for V1, only notification available */}
          {/* TODO: Re-enable in future version when alarm and share are implemented */}

          {/* Snooze Options (only for active, time-based reminders) */}
          {!reminder.isCompleted && reminder.type === 'time' && (
            <View style={styles.snoozeSection}>
              <Text style={styles.sectionTitle}>Snooze Options</Text>
              <View style={styles.snoozeButtons}>
                {[5, 10, 30, 60].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={styles.snoozeButton}
                    onPress={() => handleSnooze(mins)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.snoozeButtonText}>
                      {mins < 60 ? `${mins} min` : '1 hour'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {reminder.isCompleted ? (
              <Button
                onPress={handleReactivate}
                variant="secondary"
                loading={updateMutation.isPending}
                icon={<RotateCcw size={20} color="#64748b" />}
                size="lg"
              >
                Reactivate Reminder
              </Button>
            ) : (
              <Button
                onPress={handleComplete}
                loading={completeMutation.isPending}
                icon={<Check size={20} color="#ffffff" />}
                size="lg"
                style={styles.completeButton}
              >
                Mark as Complete
              </Button>
            )}
          </View>

          {/* Completion info */}
          {reminder.isCompleted && reminder.completedAt && (
            <View style={styles.completionInfo}>
              <Check size={16} color="#22c55e" />
              <Text style={styles.completionText}>
                Completed on {format(new Date(reminder.completedAt), 'MMM d, yyyy at h:mm a')}
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Reminder</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="What do you want to remember?"
                  placeholderTextColor="#94a3b8"
                  maxLength={200}
                />
              </View>

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Add additional details..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  maxLength={1000}
                />
              </View>

              {/* Priority Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowPriorityPicker(!showPriorityPicker)}
                >
                  <View style={styles.selectContent}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityConfig[editPriority].color }]} />
                    <Text style={styles.selectText}>{priorityConfig[editPriority].label}</Text>
                  </View>
                  <ChevronDown size={20} color="#64748b" />
                </TouchableOpacity>

                {showPriorityPicker && (
                  <View style={styles.priorityOptions}>
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityOption,
                          editPriority === p && styles.priorityOptionActive,
                        ]}
                        onPress={() => {
                          setEditPriority(p);
                          setShowPriorityPicker(false);
                        }}
                      >
                        <View style={[styles.priorityDot, { backgroundColor: priorityConfig[p].color }]} />
                        <Text style={[
                          styles.priorityOptionText,
                          editPriority === p && styles.priorityOptionTextActive,
                        ]}>
                          {priorityConfig[p].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Date/Time Selector (only for time-based reminders) */}
              {reminder?.type === 'time' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date</Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        setShowTimePicker(false);
                        setShowDatePicker(!showDatePicker);
                      }}
                    >
                      <View style={styles.selectContent}>
                        <Calendar size={20} color="#0ea5e9" />
                        <Text style={styles.selectText}>
                          {format(editDate, 'EEEE, MMMM d, yyyy')}
                        </Text>
                      </View>
                      <ChevronDown size={20} color="#64748b" style={showDatePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <View style={styles.inlinePicker}>
                        <DateTimePicker
                          value={editDate}
                          mode="date"
                          display="spinner"
                          onChange={(event, date) => {
                            if (date) {
                              const newDate = new Date(editDate);
                              newDate.setFullYear(date.getFullYear());
                              newDate.setMonth(date.getMonth());
                              newDate.setDate(date.getDate());
                              setEditDate(newDate);
                            }
                          }}
                          minimumDate={new Date()}
                          style={styles.picker}
                          themeVariant="light"
                          textColor="#1e293b"
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Time</Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowTimePicker(!showTimePicker);
                      }}
                    >
                      <View style={styles.selectContent}>
                        <Clock size={20} color="#0ea5e9" />
                        <Text style={styles.selectText}>
                          {format(editDate, 'h:mm a')}
                        </Text>
                      </View>
                      <ChevronDown size={20} color="#64748b" style={showTimePicker ? { transform: [{ rotate: '180deg' }] } : undefined} />
                    </TouchableOpacity>
                    {showTimePicker && (
                      <View style={styles.inlinePicker}>
                        <DateTimePicker
                          value={editDate}
                          mode="time"
                          display="spinner"
                          onChange={(event, time) => {
                            if (time) {
                              const newDate = new Date(editDate);
                              newDate.setHours(time.getHours());
                              newDate.setMinutes(time.getMinutes());
                              setEditDate(newDate);
                            }
                          }}
                          style={styles.picker}
                          themeVariant="light"
                          textColor="#1e293b"
                        />
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Location info (read-only for now) */}
              {reminder?.type === 'location' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <View style={styles.locationInfoBox}>
                    <MapPin size={20} color="#8b5cf6" />
                    <Text style={styles.locationInfoText}>
                      {reminder.locationName || 'Location set'}
                    </Text>
                  </View>
                  <Text style={styles.locationHint}>
                    To change location, create a new reminder
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Save Button */}
            <View style={styles.modalActions}>
              <Button
                onPress={handleSaveEdit}
                loading={updateMutation.isPending}
                size="lg"
              >
                Save Changes
              </Button>
            </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 20,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  editButton: {
    paddingHorizontal: 12,
  },
  deleteButton: {
    paddingHorizontal: 12,
  },
  headerContent: {
    zIndex: 5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  completedBadgeText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 13,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  overdueBadgeText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  activeBadgeText: {
    color: '#0ea5e9',
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  notes: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  decorCircle1: {
    width: 180,
    height: 180,
    top: -50,
    right: -50,
  },
  decorCircle2: {
    width: 120,
    height: 120,
    bottom: -40,
    left: -40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  timeDisplay: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 15,
    color: '#64748b',
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
  },
  locationDisplay: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  locationMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  locationDetail: {
    fontSize: 14,
    color: '#64748b',
  },
  snoozeSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    marginLeft: 4,
  },
  snoozeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  snoozeButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  snoozeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  actionSection: {
    marginTop: 8,
  },
  completeButton: {
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  completionText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalCloseButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectText: {
    fontSize: 16,
    color: '#1e293b',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityOptions: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  priorityOptionActive: {
    backgroundColor: '#f0f9ff',
  },
  priorityOptionText: {
    fontSize: 16,
    color: '#64748b',
  },
  priorityOptionTextActive: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  locationInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  locationInfoText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  locationHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    fontStyle: 'italic',
  },
  modalActions: {
    marginTop: 8,
    paddingBottom: 20,
  },
  // Inline picker styles
  inlinePicker: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  picker: {
    height: 180,
    backgroundColor: '#ffffff',
  },
});
