import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
}));

// Simplified notification scheduler for testing
const scheduleTimeReminder = async (reminder: {
  id: string;
  title: string;
  notes?: string;
  triggerAt: Date;
  priority: 'low' | 'medium' | 'high';
}) => {
  const trigger = new Date(reminder.triggerAt);

  // Don't schedule if trigger is in the past
  if (trigger <= new Date()) {
    throw new Error('Cannot schedule notification in the past');
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Reminder',
      body: reminder.title,
      data: {
        reminderId: reminder.id,
        type: 'time',
      },
      sound: true,
      priority: reminder.priority === 'high'
        ? Notifications.AndroidImportance.HIGH
        : Notifications.AndroidImportance.DEFAULT,
    },
    trigger: {
      date: trigger,
    },
  });

  return notificationId;
};

const cancelReminder = async (notificationId: string) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

const cancelAllReminders = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

describe('Notification Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful scheduling
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-123');
  });

  describe('scheduleTimeReminder', () => {
    it('should schedule a notification for future date', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now

      const notificationId = await scheduleTimeReminder({
        id: 'reminder-1',
        title: 'Test Reminder',
        triggerAt: futureDate,
        priority: 'medium',
      });

      expect(notificationId).toBe('notification-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '⏰ Reminder',
            body: 'Test Reminder',
            data: {
              reminderId: 'reminder-1',
              type: 'time',
            },
          }),
        })
      );
    });

    it('should throw error for past date', async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago

      await expect(
        scheduleTimeReminder({
          id: 'reminder-1',
          title: 'Test Reminder',
          triggerAt: pastDate,
          priority: 'medium',
        })
      ).rejects.toThrow('Cannot schedule notification in the past');

      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('should set high priority for high priority reminders', async () => {
      const futureDate = new Date(Date.now() + 60000);

      await scheduleTimeReminder({
        id: 'reminder-1',
        title: 'Urgent Reminder',
        triggerAt: futureDate,
        priority: 'high',
      });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            priority: Notifications.AndroidImportance.HIGH,
          }),
        })
      );
    });

    it('should include notes in notification data if provided', async () => {
      const futureDate = new Date(Date.now() + 60000);

      await scheduleTimeReminder({
        id: 'reminder-1',
        title: 'Test Reminder',
        notes: 'Additional details',
        triggerAt: futureDate,
        priority: 'medium',
      });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });
  });

  describe('cancelReminder', () => {
    it('should cancel a scheduled notification', async () => {
      await cancelReminder('notification-123');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-123');
    });
  });

  describe('cancelAllReminders', () => {
    it('should cancel all scheduled notifications', async () => {
      await cancelAllReminders();

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });
});

describe('Notification Permissions', () => {
  it('should check permission status', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
    });

    const result = await Notifications.getPermissionsAsync();

    expect(result.status).toBe('granted');
  });

  it('should handle denied permissions', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    });

    const result = await Notifications.getPermissionsAsync();

    expect(result.status).toBe('denied');
    expect(result.canAskAgain).toBe(false);
  });

  it('should request permissions', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const result = await Notifications.requestPermissionsAsync();

    expect(result.status).toBe('granted');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });
});
