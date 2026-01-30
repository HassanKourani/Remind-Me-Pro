import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock, MapPin, Bell, Volume2, Share2, Check, AlertCircle, Repeat } from 'lucide-react-native';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

import { Reminder } from '@/types/database';

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
  onComplete: () => void;
  onSnooze?: (minutes: number) => void;
  onDelete?: () => void;
}

const DeliveryIcons = {
  notification: Bell,
  alarm: Volume2,
  share: Share2,
};

const priorityColors = {
  low: { border: '#22c55e', bg: '#dcfce7' },
  medium: { border: '#f59e0b', bg: '#fef3c7' },
  high: { border: '#ef4444', bg: '#fef2f2' },
};

export function ReminderCard({ reminder, onPress, onComplete }: ReminderCardProps) {
  const DeliveryIcon = DeliveryIcons[reminder.deliveryMethod];
  const priorityStyle = priorityColors[reminder.priority];
  const isOverdue = reminder.triggerAt && isPast(new Date(reminder.triggerAt)) && !reminder.isCompleted;

  const getTimeLabel = () => {
    if (!reminder.triggerAt) return null;
    const date = new Date(reminder.triggerAt);
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        reminder.isCompleted && styles.cardCompleted,
        isOverdue && styles.cardOverdue,
      ]}
    >
      {/* Priority indicator strip */}
      <View style={[styles.priorityStrip, { backgroundColor: priorityStyle.border }]} />

      <View style={styles.content}>
        <View style={styles.mainRow}>
          {/* Completion checkbox */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!reminder.isCompleted) {
                onComplete();
              }
            }}
            style={[
              styles.checkbox,
              reminder.isCompleted && styles.checkboxCompleted,
            ]}
          >
            {reminder.isCompleted && (
              <Check size={14} color="#ffffff" strokeWidth={3} />
            )}
          </Pressable>

          {/* Content */}
          <View style={styles.textContent}>
            <Text
              style={[
                styles.title,
                reminder.isCompleted && styles.titleCompleted,
              ]}
              numberOfLines={2}
            >
              {reminder.title}
            </Text>

            {reminder.notes && (
              <Text style={styles.notes} numberOfLines={1}>
                {reminder.notes}
              </Text>
            )}

            {/* Meta info */}
            <View style={styles.metaRow}>
              {/* Time indicator */}
              {reminder.type === 'time' && reminder.triggerAt && (
                <View style={[styles.metaBadge, isOverdue && styles.metaBadgeOverdue]}>
                  <Clock size={13} color={isOverdue ? '#ef4444' : '#64748b'} />
                  <Text style={[styles.metaText, isOverdue && styles.metaTextOverdue]}>
                    {getTimeLabel()}
                  </Text>
                </View>
              )}

              {/* Location indicator */}
              {reminder.type === 'location' && (
                <View style={[styles.metaBadge, styles.metaBadgeLocation]}>
                  <MapPin size={13} color="#8b5cf6" />
                  <Text style={[styles.metaText, styles.metaTextLocation]}>
                    {reminder.locationName || 'Location'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right side indicators */}
          <View style={styles.indicators}>
            {/* Delivery method */}
            <View style={styles.indicatorIcon}>
              <DeliveryIcon size={16} color="#94a3b8" />
            </View>

            {/* Priority badge */}
            {reminder.priority === 'high' && (
              <View style={[styles.indicatorIcon, styles.indicatorHigh]}>
                <AlertCircle size={12} color="#b91c1c" />
              </View>
            )}

            {/* Recurring indicator */}
            {(reminder.recurrenceRule || reminder.isRecurringLocation) && (
              <View style={[styles.indicatorIcon, styles.indicatorRecurring]}>
                <Repeat size={14} color="#10b981" />
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.65,
    backgroundColor: '#f8fafc',
  },
  cardOverdue: {
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  priorityStrip: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    marginRight: 14,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  notes: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  metaBadgeOverdue: {
    backgroundColor: '#fef2f2',
  },
  metaBadgeLocation: {
    backgroundColor: '#f5f3ff',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  metaTextOverdue: {
    color: '#ef4444',
  },
  metaTextLocation: {
    color: '#8b5cf6',
  },
  indicators: {
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  indicatorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorHigh: {
    backgroundColor: '#fef2f2',
  },
  indicatorRecurring: {
    backgroundColor: '#ecfdf5',
  },
});
