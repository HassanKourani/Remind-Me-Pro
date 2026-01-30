import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { reminderRepository } from '@/repositories/reminderRepository';
import { notificationScheduler } from './scheduler';

interface NotificationData {
  reminderId?: string;
  type?: string;
  deliveryMethod?: string;
  shareContact?: string;
  shareMessage?: string;
}

export function setupNotificationHandlers() {
  // Handle notification received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification.request.content.title);
      // Could show in-app alert here
    }
  );

  // Handle notification interaction
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const data = response.notification.request.content.data as NotificationData;
      const { reminderId } = data;

      if (!reminderId) return;

      const actionId = response.actionIdentifier;

      switch (actionId) {
        case 'complete':
          await handleComplete(reminderId);
          break;

        case 'snooze':
          await handleSnooze(reminderId);
          break;

        case Notifications.DEFAULT_ACTION_IDENTIFIER:
          // User tapped the notification - open the reminder
          router.push(`/reminder/${reminderId}`);
          break;
      }
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

async function handleComplete(reminderId: string) {
  try {
    await reminderRepository.complete(reminderId);
  } catch (error) {
    console.error('Failed to complete reminder:', error);
  }
}

async function handleSnooze(reminderId: string) {
  try {
    await notificationScheduler.snooze(reminderId, 10);
  } catch (error) {
    console.error('Failed to snooze reminder:', error);
  }
}
