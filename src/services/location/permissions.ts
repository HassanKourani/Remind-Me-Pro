import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export type LocationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'restricted';

export interface LocationPermissionResult {
  foreground: LocationPermissionStatus;
  background: LocationPermissionStatus;
  canUseLocation: boolean;
  canUseBackgroundLocation: boolean;
}

/**
 * Get the current location permission status
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionResult> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();

  return {
    foreground: mapPermissionStatus(foreground.status),
    background: mapPermissionStatus(background.status),
    canUseLocation: foreground.status === 'granted',
    canUseBackgroundLocation: background.status === 'granted',
  };
}

/**
 * Request foreground location permission
 */
export async function requestForegroundLocationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Request background location permission
 * Note: On Android, this requires foreground permission first
 */
export async function requestBackgroundLocationPermission(): Promise<boolean> {
  // First ensure we have foreground permission
  const hasForeground = await requestForegroundLocationPermission();
  if (!hasForeground) {
    return false;
  }

  const { status: existingStatus } = await Location.getBackgroundPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  // Show explanation before requesting background permission
  const shouldProceed = await showBackgroundPermissionExplanation();
  if (!shouldProceed) {
    return false;
  }

  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Request all location permissions needed for geofencing
 */
export async function requestGeofencingPermissions(): Promise<{
  granted: boolean;
  foreground: boolean;
  background: boolean;
}> {
  const foreground = await requestForegroundLocationPermission();

  if (!foreground) {
    return { granted: false, foreground: false, background: false };
  }

  const background = await requestBackgroundLocationPermission();

  return {
    granted: foreground && background,
    foreground,
    background,
  };
}

/**
 * Get the current user location
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  const hasPermission = await requestForegroundLocationPermission();

  if (!hasPermission) {
    return null;
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Get the last known location (faster, but may be stale)
 */
export async function getLastKnownLocation(): Promise<Location.LocationObject | null> {
  const hasPermission = await requestForegroundLocationPermission();

  if (!hasPermission) {
    return null;
  }

  try {
    const location = await Location.getLastKnownPositionAsync();
    return location;
  } catch (error) {
    console.error('Error getting last known location:', error);
    return null;
  }
}

/**
 * Check if location services are enabled on the device
 */
export async function isLocationServicesEnabled(): Promise<boolean> {
  return await Location.hasServicesEnabledAsync();
}

/**
 * Open device location settings
 */
export function openLocationSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

/**
 * Show an alert prompting the user to enable location services
 */
export async function promptEnableLocationServices(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Location Services Disabled',
      'Please enable location services in your device settings to use location-based reminders.',
      [
        {
          text: 'Cancel',
          onPress: () => resolve(false),
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            openLocationSettings();
            resolve(true);
          },
        },
      ]
    );
  });
}

/**
 * Show an alert explaining why background location is needed
 */
async function showBackgroundPermissionExplanation(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Background Location Required',
      'RemindMe Pro needs access to your location in the background to trigger location-based reminders when you arrive at or leave specific places. This is essential for the location reminder feature to work properly.',
      [
        {
          text: 'Not Now',
          onPress: () => resolve(false),
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => resolve(true),
        },
      ]
    );
  });
}

/**
 * Show an alert when location permission is denied
 */
export async function promptLocationPermissionDenied(): Promise<void> {
  Alert.alert(
    'Location Permission Required',
    'To use location-based reminders, please grant location permission in your device settings.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: openLocationSettings,
      },
    ]
  );
}

/**
 * Map expo-location permission status to our simplified status
 */
function mapPermissionStatus(status: Location.PermissionStatus): LocationPermissionStatus {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    case Location.PermissionStatus.UNDETERMINED:
      return 'undetermined';
    default:
      return 'restricted';
  }
}
