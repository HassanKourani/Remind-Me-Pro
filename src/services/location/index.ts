export {
  getLocationPermissionStatus,
  requestForegroundLocationPermission,
  requestBackgroundLocationPermission,
  requestGeofencingPermissions,
  getCurrentLocation,
  getLastKnownLocation,
  isLocationServicesEnabled,
  openLocationSettings,
  promptEnableLocationServices,
  promptLocationPermissionDenied,
} from './permissions';

export type { LocationPermissionStatus, LocationPermissionResult } from './permissions';

export {
  defineGeofencingTask,
  startGeofencing,
  stopGeofencing,
  stopAllGeofencing,
  refreshAllGeofences,
  isGeofencingAvailable,
  isGeofencingRunning,
} from './geofencing';
