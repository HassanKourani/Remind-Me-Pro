import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reminderRepository } from '@/repositories/reminderRepository';
import { notificationScheduler } from '@/services/notifications/scheduler';
import { useAuthStore } from '@/stores/authStore';
import { CreateReminderInput, UpdateReminderInput } from '@/types/database';
import { addToSyncQueue, processSyncQueue, isConnected, isGuestUser } from '@/services/sync/syncService';

// Helper to sync reminder to Supabase
async function syncReminderToCloud(
  userId: string,
  reminderId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
) {
  // Don't sync for guest users
  if (isGuestUser(userId)) return;

  try {
    // Add to sync queue (will include userId for proper isolation)
    await addToSyncQueue('reminder', reminderId, operation, data, userId);

    // Try to process immediately if connected
    const connected = await isConnected();
    if (connected) {
      await processSyncQueue(userId);
    }
  } catch (error) {
    console.error('Sync error (queued for retry):', error);
  }
}

export function useReminders() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => reminderRepository.getAll(user!.id),
    enabled: !!user,
  });
}

export function useActiveReminders() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reminders', 'active', user?.id],
    queryFn: () => reminderRepository.getActive(user!.id),
    enabled: !!user,
  });
}

export function useTodayReminders() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reminders', 'today', user?.id],
    queryFn: () => reminderRepository.getToday(user!.id),
    enabled: !!user,
  });
}

export function useReminder(id: string) {
  return useQuery({
    queryKey: ['reminder', id],
    queryFn: () => reminderRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const reminder = await reminderRepository.create(user!.id, input);

      // Schedule notification for time-based reminders
      if (reminder.type === 'time' && reminder.triggerAt) {
        const notificationId = await notificationScheduler.scheduleReminder(reminder);
        if (notificationId) {
          await reminderRepository.updateNotificationId(reminder.id, notificationId);
          reminder.notificationId = notificationId;
        }
      }

      // Sync to Supabase (only for non-guest users)
      await syncReminderToCloud(
        user!.id,
        reminder.id,
        'create',
        {
          title: reminder.title,
          notes: reminder.notes,
          type: reminder.type,
          triggerAt: reminder.triggerAt,
          recurrenceRule: reminder.recurrenceRule,
          latitude: reminder.latitude,
          longitude: reminder.longitude,
          radius: reminder.radius,
          locationName: reminder.locationName,
          triggerOn: reminder.triggerOn,
          isRecurringLocation: reminder.isRecurringLocation,
          deliveryMethod: reminder.deliveryMethod,
          alarmSound: reminder.alarmSound,
          shareContactName: reminder.shareContactName,
          shareContactPhone: reminder.shareContactPhone,
          shareMessageTemplate: reminder.shareMessageTemplate,
          categoryId: reminder.categoryId,
          priority: reminder.priority,
          isCompleted: reminder.isCompleted,
          isActive: reminder.isActive,
          completedAt: reminder.completedAt,
          isDeleted: reminder.isDeleted,
        }
      );

      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateReminderInput }) => {
      const updated = await reminderRepository.update(id, data);

      // Reschedule notification if needed
      if (updated.type === 'time' && (data.triggerAt || data.isActive !== undefined)) {
        if (updated.notificationId) {
          await notificationScheduler.cancelReminder(updated.notificationId);
        }
        if (updated.isActive && !updated.isCompleted && updated.triggerAt) {
          const notificationId = await notificationScheduler.scheduleReminder(updated);
          if (notificationId) {
            await reminderRepository.updateNotificationId(updated.id, notificationId);
          }
        }
      }

      // Sync to Supabase (only for non-guest users)
      await syncReminderToCloud(
        user!.id,
        updated.id,
        'update',
        {
          title: updated.title,
          notes: updated.notes,
          type: updated.type,
          triggerAt: updated.triggerAt,
          recurrenceRule: updated.recurrenceRule,
          latitude: updated.latitude,
          longitude: updated.longitude,
          radius: updated.radius,
          locationName: updated.locationName,
          triggerOn: updated.triggerOn,
          isRecurringLocation: updated.isRecurringLocation,
          deliveryMethod: updated.deliveryMethod,
          alarmSound: updated.alarmSound,
          shareContactName: updated.shareContactName,
          shareContactPhone: updated.shareContactPhone,
          shareMessageTemplate: updated.shareMessageTemplate,
          categoryId: updated.categoryId,
          priority: updated.priority,
          isCompleted: updated.isCompleted,
          isActive: updated.isActive,
          completedAt: updated.completedAt,
          isDeleted: updated.isDeleted,
        }
      );

      return updated;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminder', id] });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const reminder = await reminderRepository.getById(id);

      // Cancel any scheduled notification
      if (reminder?.notificationId) {
        await notificationScheduler.cancelReminder(reminder.notificationId);
      }

      const completed = await reminderRepository.complete(id);

      // Sync to Supabase (only for non-guest users)
      await syncReminderToCloud(
        user!.id,
        id,
        'update',
        {
          title: completed.title,
          notes: completed.notes,
          type: completed.type,
          triggerAt: completed.triggerAt,
          recurrenceRule: completed.recurrenceRule,
          latitude: completed.latitude,
          longitude: completed.longitude,
          radius: completed.radius,
          locationName: completed.locationName,
          triggerOn: completed.triggerOn,
          isRecurringLocation: completed.isRecurringLocation,
          deliveryMethod: completed.deliveryMethod,
          alarmSound: completed.alarmSound,
          shareContactName: completed.shareContactName,
          shareContactPhone: completed.shareContactPhone,
          shareMessageTemplate: completed.shareMessageTemplate,
          categoryId: completed.categoryId,
          priority: completed.priority,
          isCompleted: true,
          isActive: false,
          completedAt: completed.completedAt,
          isDeleted: completed.isDeleted,
        }
      );

      return completed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const reminder = await reminderRepository.getById(id);

      // Cancel any scheduled notification
      if (reminder?.notificationId) {
        await notificationScheduler.cancelReminder(reminder.notificationId);
      }

      await reminderRepository.delete(id);

      // Sync to Supabase (only for non-guest users)
      await syncReminderToCloud(
        user!.id,
        id,
        'delete',
        { isDeleted: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useReminderCount() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reminders', 'count', user?.id],
    queryFn: () => reminderRepository.countActive(user!.id),
    enabled: !!user,
  });
}
