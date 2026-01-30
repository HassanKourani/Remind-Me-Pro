import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getDatabase } from '@/services/database/sqlite';
import { scheduleNotification } from '@/services/notifications/scheduler';
import { requestBackgroundLocationPermission } from './permissions';

const GEOFENCING_TASK = 'REMINDME_GEOFENCING_TASK';

interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter?: boolean;
  notifyOnExit?: boolean;
}

interface GeofenceEvent {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

/**
 * Define the geofencing background task
 * This must be called at the top level of your app
 */
export function defineGeofencingTask(): void {
  TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Geofencing task error:', error);
      return;
    }

    const geofenceData = data as GeofenceEvent;
    if (!geofenceData) return;

    const { eventType, region } = geofenceData;

    try {
      await handleGeofenceEvent(eventType, region);
    } catch (err) {
      console.error('Error handling geofence event:', err);
    }
  });
}

/**
 * Handle a geofence event (enter or exit)
 */
async function handleGeofenceEvent(
  eventType: Location.GeofencingEventType,
  region: Location.LocationRegion
): Promise<void> {
  const reminderId = region.identifier;

  if (!reminderId) {
    return;
  }

  // Get reminder from database
  const db = await getDatabase();
  const reminder = await db.getFirstAsync<{
    id: string;
    title: string;
    notes: string | null;
    trigger_on: 'enter' | 'exit' | 'both';
    is_recurring_location: number;
    is_active: number;
    is_completed: number;
    delivery_method: string;
  }>(
    'SELECT * FROM reminders WHERE id = ? AND is_active = 1 AND is_completed = 0',
    [reminderId]
  );

  if (!reminder) {
    // Reminder no longer exists or is inactive, remove geofence
    await stopGeofencing(reminderId);
    return;
  }

  // Check if we should trigger based on event type
  const shouldTrigger =
    reminder.trigger_on === 'both' ||
    (reminder.trigger_on === 'enter' && eventType === Location.GeofencingEventType.Enter) ||
    (reminder.trigger_on === 'exit' && eventType === Location.GeofencingEventType.Exit);

  if (!shouldTrigger) {
    return;
  }

  // Trigger the reminder
  const eventTypeText = eventType === Location.GeofencingEventType.Enter ? 'Arrived at' : 'Left';
  const body = reminder.notes || `${eventTypeText} ${reminderId}`;

  await scheduleNotification({
    title: reminder.title,
    body,
    data: { reminderId: reminder.id, type: 'location' },
    trigger: null, // Immediate notification
  });

  // Record the trigger in history
  await db.runAsync(
    `INSERT INTO reminder_history (id, reminder_id, triggered_at, trigger_type, delivery_status)
     VALUES (?, ?, datetime('now'), ?, 'delivered')`,
    [
      `${reminderId}-${Date.now()}`,
      reminderId,
      eventType === Location.GeofencingEventType.Enter ? 'location_enter' : 'location_exit',
    ]
  );

  // If not recurring, mark as completed and stop geofencing
  if (!reminder.is_recurring_location) {
    await db.runAsync(
      `UPDATE reminders SET is_completed = 1, completed_at = datetime('now') WHERE id = ?`,
      [reminderId]
    );
    await stopGeofencing(reminderId);
  }
}

/**
 * Start geofencing for a specific reminder
 */
export async function startGeofencing(
  reminderId: string,
  latitude: number,
  longitude: number,
  radius: number = 100,
  triggerOn: 'enter' | 'exit' | 'both' = 'enter'
): Promise<boolean> {
  // Request background location permission if not granted
  const hasPermission = await requestBackgroundLocationPermission();
  if (!hasPermission) {
    console.log('Background location permission not granted');
    return false;
  }

  const region: GeofenceRegion = {
    identifier: reminderId,
    latitude,
    longitude,
    radius: Math.max(radius, 100), // Minimum 100 meters for reliability
    notifyOnEnter: triggerOn === 'enter' || triggerOn === 'both',
    notifyOnExit: triggerOn === 'exit' || triggerOn === 'both',
  };

  try {
    await Location.startGeofencingAsync(GEOFENCING_TASK, [region]);

    // Update reminder with geofence ID
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE reminders SET geofence_id = ? WHERE id = ?',
      [reminderId, reminderId]
    );

    return true;
  } catch (error) {
    console.error('Failed to start geofencing:', error);
    return false;
  }
}

/**
 * Stop geofencing for a specific reminder
 */
export async function stopGeofencing(reminderId: string): Promise<void> {
  try {
    // Get all current regions
    const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
    const currentRegions = isRunning
      ? await getActiveGeofenceRegions()
      : [];

    // Filter out the region we want to remove
    const remainingRegions = currentRegions.filter(
      (region) => region.identifier !== reminderId
    );

    if (remainingRegions.length === 0) {
      // No more regions, stop geofencing entirely
      if (isRunning) {
        await Location.stopGeofencingAsync(GEOFENCING_TASK);
      }
    } else {
      // Restart geofencing with remaining regions
      await Location.startGeofencingAsync(GEOFENCING_TASK, remainingRegions);
    }

    // Clear geofence ID from reminder
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE reminders SET geofence_id = NULL WHERE id = ?',
      [reminderId]
    );
  } catch (error) {
    console.error('Failed to stop geofencing:', error);
  }
}

/**
 * Stop all geofencing
 */
export async function stopAllGeofencing(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
    if (isRunning) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK);
    }
  } catch (error) {
    console.error('Failed to stop all geofencing:', error);
  }
}

/**
 * Get all active geofence regions
 */
async function getActiveGeofenceRegions(): Promise<GeofenceRegion[]> {
  const db = await getDatabase();
  const activeReminders = await db.getAllAsync<{
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
    trigger_on: 'enter' | 'exit' | 'both';
  }>(
    `SELECT id, latitude, longitude, radius, trigger_on
     FROM reminders
     WHERE type = 'location'
       AND is_active = 1
       AND is_completed = 0
       AND is_deleted = 0
       AND latitude IS NOT NULL
       AND longitude IS NOT NULL`
  );

  return activeReminders.map((reminder) => ({
    identifier: reminder.id,
    latitude: reminder.latitude,
    longitude: reminder.longitude,
    radius: Math.max(reminder.radius, 100),
    notifyOnEnter: reminder.trigger_on === 'enter' || reminder.trigger_on === 'both',
    notifyOnExit: reminder.trigger_on === 'exit' || reminder.trigger_on === 'both',
  }));
}

/**
 * Refresh all geofences based on active reminders
 */
export async function refreshAllGeofences(): Promise<void> {
  try {
    const hasPermission = await requestBackgroundLocationPermission();
    if (!hasPermission) {
      console.log('Background location permission not granted, skipping geofence refresh');
      return;
    }

    const regions = await getActiveGeofenceRegions();

    if (regions.length === 0) {
      await stopAllGeofencing();
      return;
    }

    await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
    console.log(`Refreshed ${regions.length} geofences`);
  } catch (error) {
    console.error('Failed to refresh geofences:', error);
  }
}

/**
 * Check if geofencing is supported on this device
 */
export async function isGeofencingAvailable(): Promise<boolean> {
  try {
    // expo-location doesn't have isGeofencingAvailableAsync
    // Check if we have the necessary permissions instead
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Check if geofencing is currently running
 */
export async function isGeofencingRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
  } catch {
    return false;
  }
}
