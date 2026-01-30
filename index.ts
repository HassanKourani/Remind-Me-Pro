// Register background tasks before anything else
import { defineGeofencingTask } from '@/services/location/geofencing';

// Define the geofencing task - must be called at top level
defineGeofencingTask();

import 'expo-router/entry';
