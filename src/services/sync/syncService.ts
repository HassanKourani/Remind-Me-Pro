import { getDatabase } from '@/services/database/sqlite';
import { supabase } from '@/services/supabase/client';
import { Database } from '@/types/supabase';
import NetInfo from '@react-native-community/netinfo';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type SavedPlaceRow = Database['public']['Tables']['saved_places']['Row'];

interface SyncQueueItem {
  id: string;
  entity_type: 'reminder' | 'category' | 'saved_place';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
  user_id: string | null;
}

/**
 * Check if user is eligible for syncing (not a guest)
 */
export function isGuestUser(userId: string): boolean {
  return userId.startsWith('guest_');
}

/**
 * Check if device is connected to internet
 */
export async function isConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * Add an item to the sync queue for later processing
 * Note: Won't add to queue for guest users since they can't sync
 */
export async function addToSyncQueue(
  entityType: 'reminder' | 'category' | 'saved_place',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>,
  userId: string
): Promise<void> {
  // Don't add to sync queue for guest users
  if (isGuestUser(userId)) {
    console.log('📴 Guest user - skipping sync queue');
    return;
  }

  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at, attempts, user_id)
     VALUES (?, ?, ?, ?, ?, datetime('now'), 0, ?)`,
    [
      `${entityType}-${entityId}-${Date.now()}`,
      entityType,
      entityId,
      operation,
      JSON.stringify(data),
      userId,
    ] as (string | number | null)[]
  );
}

/**
 * Process all pending items in the sync queue
 */
export async function processSyncQueue(userId: string): Promise<{
  success: number;
  failed: number;
}> {
  // Don't sync for guest users
  if (isGuestUser(userId)) {
    console.log('📴 Guest user - sync not available');
    return { success: 0, failed: 0 };
  }

  // Check connectivity first
  const connected = await isConnected();
  if (!connected) {
    console.log('📴 No internet connection, sync skipped');
    return { success: 0, failed: 0 };
  }

  const db = await getDatabase();
  // Only process sync items for this specific user
  const pendingItems = await db.getAllAsync<SyncQueueItem>(
    'SELECT * FROM sync_queue WHERE attempts < 3 AND (user_id = ? OR user_id IS NULL) ORDER BY created_at ASC',
    [userId]
  );

  if (pendingItems.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`🔄 Processing ${pendingItems.length} sync queue items...`);

  let success = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      const data = JSON.parse(item.payload);

      switch (item.entity_type) {
        case 'reminder':
          await syncReminder(userId, item.entity_id, item.operation, data);
          break;
        case 'category':
          await syncCategory(userId, item.entity_id, item.operation, data);
          break;
        case 'saved_place':
          await syncSavedPlace(userId, item.entity_id, item.operation, data);
          break;
      }

      // Remove from queue on success
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
      success++;
      console.log(`✅ Synced ${item.entity_type} ${item.entity_id} successfully`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error(`❌ Sync failed for ${item.entity_type} ${item.entity_id}:`, errorMessage);

      // Increment retry count and update last attempt time
      await db.runAsync(
        `UPDATE sync_queue SET attempts = attempts + 1, last_attempt_at = datetime('now') WHERE id = ?`,
        [item.id]
      );
      failed++;
    }
  }

  console.log(`🔄 Sync complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * Sync a reminder to Supabase
 */
async function syncReminder(
  userId: string,
  reminderId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<void> {
  console.log(`🔄 Syncing reminder ${reminderId} (${operation})`);

  switch (operation) {
    case 'create':
    case 'update': {
      const reminderData: Database['public']['Tables']['reminders']['Insert'] = {
        id: reminderId,
        user_id: userId,
        title: data.title as string,
        notes: data.notes as string | null,
        type: data.type as 'time' | 'location',
        trigger_at: data.triggerAt as string | null,
        recurrence_rule: data.recurrenceRule as string | null,
        latitude: data.latitude as number | null,
        longitude: data.longitude as number | null,
        radius: (data.radius as number) || 200,
        location_name: data.locationName as string | null,
        trigger_on: data.triggerOn as 'enter' | 'exit' | 'both' | null,
        is_recurring_location: (data.isRecurringLocation as boolean) || false,
        delivery_method: (data.deliveryMethod as 'notification' | 'alarm' | 'share') || 'notification',
        alarm_sound: data.alarmSound as string | null,
        share_contact_name: data.shareContactName as string | null,
        share_contact_phone: data.shareContactPhone as string | null,
        share_message_template: data.shareMessageTemplate as string | null,
        category_id: data.categoryId as string | null,
        priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
        is_completed: (data.isCompleted as boolean) || false,
        is_active: data.isActive !== false,
        completed_at: data.completedAt as string | null,
        is_deleted: (data.isDeleted as boolean) || false,
      };

      const { error } = await supabase
        .from('reminders')
        .upsert(reminderData as never)
        .select();

      if (error) {
        console.error('Supabase upsert error:', error.message, error.details, error.hint);
        throw new Error(`Supabase error: ${error.message}`);
      }
      break;
    }

    case 'delete': {
      const { error } = await supabase
        .from('reminders')
        .update({ is_deleted: true } as never)
        .eq('id', reminderId);

      if (error) {
        console.error('Supabase delete error:', error.message);
        throw new Error(`Supabase delete error: ${error.message}`);
      }
      break;
    }
  }
}

/**
 * Sync a category to Supabase
 */
async function syncCategory(
  userId: string,
  categoryId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update': {
      const categoryData: Database['public']['Tables']['categories']['Insert'] = {
        id: categoryId,
        user_id: userId,
        name: data.name as string,
        color: data.color as string,
        icon: data.icon as string,
        sort_order: (data.sortOrder as number) || 0,
      };

      const { error } = await supabase
        .from('categories')
        .upsert(categoryData as never);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      break;
    }

    case 'delete': {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      break;
    }
  }
}

/**
 * Sync a saved place to Supabase
 */
async function syncSavedPlace(
  userId: string,
  placeId: string,
  operation: 'create' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update': {
      const placeData: Database['public']['Tables']['saved_places']['Insert'] = {
        id: placeId,
        user_id: userId,
        name: data.name as string,
        address: data.address as string | null,
        latitude: data.latitude as number,
        longitude: data.longitude as number,
        icon: data.icon as string,
      };

      const { error } = await supabase
        .from('saved_places')
        .upsert(placeData as never);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      break;
    }

    case 'delete': {
      const { error } = await supabase
        .from('saved_places')
        .delete()
        .eq('id', placeId);

      if (error) throw new Error(`Supabase error: ${error.message}`);
      break;
    }
  }
}

/**
 * Pull all data from Supabase and merge with local SQLite
 */
export async function pullFromCloud(userId: string): Promise<{
  reminders: number;
  categories: number;
  savedPlaces: number;
}> {
  // Don't sync for guest users
  if (isGuestUser(userId)) {
    console.log('📴 Guest user - cloud sync not available');
    return { reminders: 0, categories: 0, savedPlaces: 0 };
  }

  // Check connectivity first
  const connected = await isConnected();
  if (!connected) {
    console.log('📴 No internet connection, pull skipped');
    return { reminders: 0, categories: 0, savedPlaces: 0 };
  }

  const db = await getDatabase();
  let reminders = 0;
  let categories = 0;
  let savedPlaces = 0;

  // Pull reminders
  const { data: cloudReminders, error: remindersError } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (remindersError) {
    console.error('Error pulling reminders:', remindersError.message);
  }

  if (cloudReminders) {
    for (const reminder of cloudReminders as ReminderRow[]) {
      await db.runAsync(
        `INSERT OR REPLACE INTO reminders (
          id, user_id, title, notes, type, trigger_at, recurrence_rule,
          latitude, longitude, radius, location_name, trigger_on,
          is_recurring_location, delivery_method, alarm_sound,
          share_contact_name, share_contact_phone, share_message_template,
          category_id, priority, is_completed, is_active, completed_at,
          is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reminder.id,
          reminder.user_id,
          reminder.title,
          reminder.notes,
          reminder.type,
          reminder.trigger_at,
          reminder.recurrence_rule,
          reminder.latitude,
          reminder.longitude,
          reminder.radius,
          reminder.location_name,
          reminder.trigger_on,
          reminder.is_recurring_location ? 1 : 0,
          reminder.delivery_method,
          reminder.alarm_sound,
          reminder.share_contact_name,
          reminder.share_contact_phone,
          reminder.share_message_template,
          reminder.category_id,
          reminder.priority,
          reminder.is_completed ? 1 : 0,
          reminder.is_active ? 1 : 0,
          reminder.completed_at,
          reminder.is_deleted ? 1 : 0,
          reminder.created_at,
          reminder.updated_at,
        ] as (string | number | null)[]
      );
      reminders++;
    }
  }

  // Pull categories
  const { data: cloudCategories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId);

  if (categoriesError) {
    console.error('Error pulling categories:', categoriesError.message);
  }

  if (cloudCategories) {
    for (const category of cloudCategories as CategoryRow[]) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (
          id, user_id, name, color, icon, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.user_id,
          category.name,
          category.color,
          category.icon,
          category.sort_order,
          category.created_at,
        ] as (string | number | null)[]
      );
      categories++;
    }
  }

  // Pull saved places
  const { data: cloudPlaces, error: placesError } = await supabase
    .from('saved_places')
    .select('*')
    .eq('user_id', userId);

  if (placesError) {
    console.error('Error pulling saved places:', placesError.message);
  }

  if (cloudPlaces) {
    for (const place of cloudPlaces as SavedPlaceRow[]) {
      await db.runAsync(
        `INSERT OR REPLACE INTO saved_places (
          id, user_id, name, address, latitude, longitude, icon, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          place.id,
          place.user_id,
          place.name,
          place.address,
          place.latitude,
          place.longitude,
          place.icon,
          place.created_at,
        ] as (string | number | null)[]
      );
      savedPlaces++;
    }
  }

  console.log(`📥 Pulled from cloud: ${reminders} reminders, ${categories} categories, ${savedPlaces} places`);
  return { reminders, categories, savedPlaces };
}

/**
 * Push all local data to Supabase
 */
export async function pushToCloud(userId: string): Promise<{
  reminders: number;
  categories: number;
  savedPlaces: number;
}> {
  // Don't sync for guest users
  if (isGuestUser(userId)) {
    console.log('📴 Guest user - cloud sync not available');
    return { reminders: 0, categories: 0, savedPlaces: 0 };
  }

  // Check connectivity first
  const connected = await isConnected();
  if (!connected) {
    console.log('📴 No internet connection, push skipped');
    return { reminders: 0, categories: 0, savedPlaces: 0 };
  }

  const db = await getDatabase();
  let reminders = 0;
  let categories = 0;
  let savedPlaces = 0;

  // Push reminders
  const localReminders = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM reminders WHERE user_id = ? AND is_deleted = 0',
    [userId]
  );

  for (const reminder of localReminders) {
    const reminderData: Database['public']['Tables']['reminders']['Insert'] = {
      id: reminder.id as string,
      user_id: userId,
      title: reminder.title as string,
      notes: reminder.notes as string | null,
      type: reminder.type as 'time' | 'location',
      trigger_at: reminder.trigger_at as string | null,
      recurrence_rule: reminder.recurrence_rule as string | null,
      latitude: reminder.latitude as number | null,
      longitude: reminder.longitude as number | null,
      radius: (reminder.radius as number) || 200,
      location_name: reminder.location_name as string | null,
      trigger_on: reminder.trigger_on as 'enter' | 'exit' | 'both' | null,
      is_recurring_location: Boolean(reminder.is_recurring_location),
      delivery_method: (reminder.delivery_method as 'notification' | 'alarm' | 'share') || 'notification',
      alarm_sound: reminder.alarm_sound as string | null,
      share_contact_name: reminder.share_contact_name as string | null,
      share_contact_phone: reminder.share_contact_phone as string | null,
      share_message_template: reminder.share_message_template as string | null,
      category_id: reminder.category_id as string | null,
      priority: (reminder.priority as 'low' | 'medium' | 'high') || 'medium',
      is_completed: Boolean(reminder.is_completed),
      is_active: reminder.is_active !== 0,
      completed_at: reminder.completed_at as string | null,
      is_deleted: Boolean(reminder.is_deleted),
    };

    const { error } = await supabase
      .from('reminders')
      .upsert(reminderData as never);

    if (!error) reminders++;
    else console.error('Push reminder error:', error.message);
  }

  // Push categories
  const localCategories = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM categories WHERE user_id = ?',
    [userId]
  );

  for (const category of localCategories) {
    const categoryData: Database['public']['Tables']['categories']['Insert'] = {
      id: category.id as string,
      user_id: userId,
      name: category.name as string,
      color: category.color as string,
      icon: category.icon as string,
      sort_order: (category.sort_order as number) || 0,
    };

    const { error } = await supabase
      .from('categories')
      .upsert(categoryData as never);

    if (!error) categories++;
  }

  // Push saved places
  const localPlaces = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM saved_places WHERE user_id = ?',
    [userId]
  );

  for (const place of localPlaces) {
    const placeData: Database['public']['Tables']['saved_places']['Insert'] = {
      id: place.id as string,
      user_id: userId,
      name: place.name as string,
      address: place.address as string | null,
      latitude: place.latitude as number,
      longitude: place.longitude as number,
      icon: place.icon as string,
    };

    const { error } = await supabase
      .from('saved_places')
      .upsert(placeData as never);

    if (!error) savedPlaces++;
  }

  console.log(`📤 Pushed to cloud: ${reminders} reminders, ${categories} categories, ${savedPlaces} places`);
  return { reminders, categories, savedPlaces };
}

/**
 * Full sync: push local changes, then pull remote changes
 */
export async function fullSync(userId: string): Promise<void> {
  // Don't sync for guest users
  if (isGuestUser(userId)) {
    console.log('📴 Guest user - cloud sync not available');
    return;
  }

  // Check connectivity first
  const connected = await isConnected();
  if (!connected) {
    console.log('📴 No internet connection, full sync skipped');
    return;
  }

  console.log('🔄 Starting full sync...');

  // First, process any pending sync queue items
  await processSyncQueue(userId);

  // Then push any local changes
  await pushToCloud(userId);

  // Finally, pull remote changes
  await pullFromCloud(userId);

  console.log('✅ Full sync complete');
}

/**
 * Get count of pending sync items
 */
export async function getPendingSyncCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue WHERE attempts < 3'
  );
  return result?.count || 0;
}

/**
 * Clear failed sync items (items that failed 3+ times)
 */
export async function clearFailedSyncItems(): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM sync_queue WHERE attempts >= 3');
  return result.changes;
}
