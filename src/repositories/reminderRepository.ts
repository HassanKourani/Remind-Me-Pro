import { getDatabase } from '@/services/database/sqlite';
import { Reminder, CreateReminderInput, UpdateReminderInput } from '@/types/database';
import { mapReminderFromDb, mapReminderToDb } from '@/lib/mappers';
import { generateId } from '@/lib/utils';

export const reminderRepository = {
  // Get all reminders for a user
  async getAll(userId: string): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE user_id = ? AND is_deleted = 0
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map(mapReminderFromDb);
  },

  // Get active reminders
  async getActive(userId: string): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0
       ORDER BY
         CASE WHEN type = 'time' THEN trigger_at ELSE created_at END ASC`,
      [userId]
    );
    return rows.map(mapReminderFromDb);
  },

  // Get today's reminders (both active and completed)
  async getToday(userId: string): Promise<Reminder[]> {
    const db = await getDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM reminders
       WHERE user_id = ?
         AND is_deleted = 0
         AND type = 'time'
         AND (
           (trigger_at >= ? AND trigger_at < ?)
           OR (completed_at >= ? AND completed_at < ?)
         )
       ORDER BY
         is_completed ASC,
         CASE WHEN is_completed = 0 THEN trigger_at ELSE completed_at END ASC`,
      [userId, today.toISOString(), tomorrow.toISOString(), today.toISOString(), tomorrow.toISOString()]
    );
    return rows.map(mapReminderFromDb);
  },

  // Get single reminder
  async getById(id: string): Promise<Reminder | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM reminders WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    return row ? mapReminderFromDb(row) : null;
  },

  // Create reminder
  async create(userId: string, input: CreateReminderInput): Promise<Reminder> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const reminder: Reminder = {
      id,
      userId,
      title: input.title,
      notes: input.notes || null,
      type: input.type,
      triggerAt: input.triggerAt || null,
      recurrenceRule: input.recurrenceRule || null,
      nextTriggerAt: input.triggerAt || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      radius: input.radius || 200,
      locationName: input.locationName || null,
      triggerOn: input.triggerOn || null,
      isRecurringLocation: input.isRecurringLocation || false,
      deliveryMethod: input.deliveryMethod || 'notification',
      alarmSound: input.alarmSound || null,
      shareContactName: input.shareContactName || null,
      shareContactPhone: input.shareContactPhone || null,
      shareMessageTemplate: input.shareMessageTemplate || null,
      categoryId: input.categoryId || null,
      priority: input.priority || 'medium',
      isCompleted: false,
      isActive: true,
      completedAt: null,
      notificationId: null,
      geofenceId: null,
      syncedAt: null,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const dbData = mapReminderToDb(reminder);
    const columns = Object.keys(dbData).join(', ');
    const placeholders = Object.keys(dbData).map(() => '?').join(', ');

    await db.runAsync(
      `INSERT INTO reminders (${columns}) VALUES (${placeholders})`,
      Object.values(dbData) as (string | number | null)[]
    );

    return reminder;
  },

  // Update reminder
  async update(id: string, input: UpdateReminderInput): Promise<Reminder> {
    const db = await getDatabase();
    const existing = await this.getById(id);

    if (!existing) {
      throw new Error('Reminder not found');
    }

    const updates: Partial<Reminder> & { updatedAt: string } = {
      ...input,
      updatedAt: new Date().toISOString(),
    };

    const dbUpdates = mapReminderToDb(updates);
    const setClause = Object.keys(dbUpdates)
      .map((key) => `${key} = ?`)
      .join(', ');

    await db.runAsync(
      `UPDATE reminders SET ${setClause} WHERE id = ?`,
      [...Object.values(dbUpdates), id] as (string | number | null)[]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error('Failed to update reminder');

    return updated;
  },

  // Complete reminder
  async complete(id: string): Promise<Reminder> {
    return this.update(id, {
      isCompleted: true,
      isActive: false,
      completedAt: new Date().toISOString(),
    });
  },

  // Delete reminder (soft delete)
  async delete(id: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      `UPDATE reminders SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  },

  // Update notification ID
  async updateNotificationId(id: string, notificationId: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET notification_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [notificationId, id]
    );
  },

  // Update geofence ID
  async updateGeofenceId(id: string, geofenceId: string | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET geofence_id = ?, updated_at = datetime('now') WHERE id = ?`,
      [geofenceId, id]
    );
  },

  // Count active reminders (for free tier limit)
  async countActive(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM reminders
       WHERE user_id = ? AND is_deleted = 0 AND is_active = 1 AND is_completed = 0`,
      [userId]
    );
    return result?.count || 0;
  },
};
