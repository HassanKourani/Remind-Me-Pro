import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder } from '@/types/database';
import { getDatabase } from '@/services/database/sqlite';

/**
 * Schedule an immediate notification
 */
export async function scheduleNotification(options: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  trigger: Notifications.NotificationTriggerInput | null;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: options.title,
      body: options.body,
      data: options.data,
      sound: 'default',
      categoryIdentifier: 'reminder',
      badge: 1,
    },
    trigger: options.trigger,
  });
}

export const notificationScheduler = {
  async scheduleReminder(reminder: Reminder): Promise<string | null> {
    if (reminder.type === 'location') {
      // Location reminders use geofencing, not scheduled notifications
      return null;
    }

    if (!reminder.triggerAt) {
      throw new Error('Time reminder requires triggerAt');
    }

    const triggerDate = new Date(reminder.triggerAt);

    // Don't schedule if in the past
    if (triggerDate <= new Date()) {
      return null;
    }

    const channelId = reminder.deliveryMethod === 'alarm' ? 'alarms' : 'reminders';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.notes || this.getDefaultBody(reminder),
        data: {
          reminderId: reminder.id,
          type: 'time_reminder',
          deliveryMethod: reminder.deliveryMethod,
          shareContact: reminder.shareContactPhone,
          shareMessage: reminder.shareMessageTemplate,
        },
        sound: this.getSound(reminder) ?? undefined,
        categoryIdentifier: 'reminder',
        badge: 1,
      },
      trigger: Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
    });

    return notificationId;
  },

  getDefaultBody(reminder: Reminder): string {
    if (reminder.priority === 'high') {
      return 'High priority reminder!';
    }
    return "It's time for your reminder";
  },

  getSound(reminder: Reminder): string | null {
    if (reminder.deliveryMethod !== 'alarm') {
      return 'default';
    }
    return reminder.alarmSound || 'default';
  },

  async cancelReminder(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async cancelAllForReminder(reminderId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduled) {
      const data = notification.content.data as { reminderId?: string } | undefined;
      if (data?.reminderId === reminderId) {
        await this.cancelReminder(notification.identifier);
      }
    }
  },

  async rescheduleReminder(reminder: Reminder): Promise<string | null> {
    // Cancel existing
    if (reminder.notificationId) {
      await this.cancelReminder(reminder.notificationId);
    }

    // Schedule new
    return this.scheduleReminder(reminder);
  },

  async snooze(reminderId: string, minutes: number = 10): Promise<string> {
    const db = await getDatabase();
    const reminder = await db.getFirstAsync<{ title: string }>(
      'SELECT title FROM reminders WHERE id = ?',
      [reminderId]
    );

    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);

    return Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${reminder?.title || 'Reminder'}`,
        body: `Snoozed reminder (${minutes} min)`,
        data: {
          reminderId,
          type: 'snoozed',
        },
        categoryIdentifier: 'reminder',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeTime,
      },
    });
  },

  async getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
