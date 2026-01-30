import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapPin, Search, Navigation, X, Minus, Plus } from 'lucide-react-native';

interface LocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    locationName: string;
    radius: number;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    locationName?: string;
    radius?: number;
  };
}

interface PlacePrediction {
  place_id: string;
  description: string;
  latitude: number;
  longitude: number;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationIQResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  display_place: string;
  display_address: string;
  type: string;
  class: string;
  address: {
    name?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// Get LocationIQ API key from environment
const LOCATIONIQ_API_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY || '';

const RADIUS_OPTIONS = [100, 200, 500, 1000, 2000];

export function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const mapRef = useRef<MapView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName: string;
  } | null>(initialLocation ? {
    latitude: initialLocation.latitude,
    longitude: initialLocation.longitude,
    locationName: initialLocation.locationName || 'Selected Location',
  } : null);
  const [radius, setRadius] = useState(initialLocation?.radius || 200);
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 37.78825,
    longitude: initialLocation?.longitude || -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(!initialLocation);

  // Get user's current location on mount
  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, []);

  // Update parent when location or radius changes
  useEffect(() => {
    if (selectedLocation) {
      onLocationSelect({
        ...selectedLocation,
        radius,
      });
    }
  }, [selectedLocation, radius]);

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Debounce search to avoid too many requests
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search for places using LocationIQ API
  const searchPlaces = (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (!LOCATIONIQ_API_KEY) {
          console.warn('LocationIQ API key not configured, falling back to expo-location');
          throw new Error('No API key');
        }

        // Use LocationIQ Autocomplete API - excellent for places, airports, POIs
        const params = new URLSearchParams({
          key: LOCATIONIQ_API_KEY,
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '6',
          dedupe: '1',
        });

        const response = await fetch(
          `https://api.locationiq.com/v1/autocomplete?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('LocationIQ error:', errorText);
          throw new Error('Search failed');
        }

        const results: LocationIQResult[] = await response.json();

        const formattedPredictions: PlacePrediction[] = results.map((result, index) => {
          // LocationIQ provides display_place (main name) and display_address (secondary)
          const mainText = result.display_place || result.address?.name || result.display_name.split(',')[0] || 'Unknown';

          // Build secondary text from address or use display_address
          let secondaryText = result.display_address || '';
          if (!secondaryText && result.address) {
            const addr = result.address;
            secondaryText = [
              addr.road,
              addr.suburb,
              addr.city || addr.town || addr.village,
              addr.state,
              addr.country,
            ].filter((p): p is string => Boolean(p) && p !== mainText).join(', ');
          }

          return {
            place_id: `liq-${result.place_id}-${index}`,
            description: result.display_name,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            structured_formatting: {
              main_text: mainText,
              secondary_text: secondaryText,
            },
          };
        });

        setPredictions(formattedPredictions);
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to expo-location geocoding
        try {
          const results = await Location.geocodeAsync(query);
          if (results.length > 0) {
            const { latitude, longitude } = results[0];
            const reverseResults = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (reverseResults.length > 0) {
              const addr = reverseResults[0];
              setPredictions([{
                place_id: `fallback-${latitude}-${longitude}`,
                description: query,
                latitude,
                longitude,
                structured_formatting: {
                  main_text: addr.name || addr.street || query,
                  secondary_text: [addr.city, addr.region, addr.country].filter(Boolean).join(', '),
                },
              }]);
              return;
            }
          }
        } catch {
          // Ignore fallback errors
        }
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setSearchQuery(prediction.structured_formatting.main_text);
    setPredictions([]);

    // Use coordinates directly from prediction (already have them from Nominatim)
    const { latitude, longitude } = prediction;
    const locationName = prediction.structured_formatting.main_text;

    const newLocation = {
      latitude,
      longitude,
      locationName,
    };

    setSelectedLocation(newLocation);

    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  const handleMapPress = async (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    try {
      const reverseResults = await Location.reverseGeocodeAsync({ latitude, longitude });
      let locationName = 'Selected Location';

      if (reverseResults.length > 0) {
        const addr = reverseResults[0];
        locationName = addr.name || addr.street ||
          [addr.city, addr.region].filter(Boolean).join(', ') ||
          'Selected Location';
      }

      setSelectedLocation({
        latitude,
        longitude,
        locationName,
      });
      setSearchQuery(locationName);
    } catch (error) {
      console.error('Reverse geocode error:', error);
      setSelectedLocation({
        latitude,
        longitude,
        locationName: 'Selected Location',
      });
    }
  };

  const adjustRadius = (delta: number) => {
    const currentIndex = RADIUS_OPTIONS.indexOf(radius);
    const newIndex = Math.max(0, Math.min(RADIUS_OPTIONS.length - 1, currentIndex + delta));
    setRadius(RADIUS_OPTIONS[newIndex]);
  };

  const formatRadius = (r: number): string => {
    if (r >= 1000) {
      return `${r / 1000}km`;
    }
    return `${r}m`;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchPlaces(text);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setPredictions([]);
              }}
              style={styles.clearButton}
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={getCurrentLocation}
          style={styles.locationButton}
          activeOpacity={0.7}
        >
          <Navigation size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {predictions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.predictionItem}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.7}
              >
                <View style={styles.predictionIcon}>
                  <MapPin size={18} color="#64748b" />
                </View>
                <View style={styles.predictionText}>
                  <Text style={styles.predictionMain} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.predictionSecondary} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={region}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {selectedLocation && (
              <>
                <Marker
                  coordinate={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  title={selectedLocation.locationName}
                />
                <Circle
                  center={{
                    latitude: selectedLocation.latitude,
                    longitude: selectedLocation.longitude,
                  }}
                  radius={radius}
                  fillColor="rgba(14, 165, 233, 0.15)"
                  strokeColor="rgba(14, 165, 233, 0.5)"
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
        )}

        {/* Map overlay hint */}
        {!selectedLocation && !isLoadingLocation && (
          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Tap on the map to select a location</Text>
          </View>
        )}
      </View>

      {/* Radius Selector */}
      <View style={styles.radiusContainer}>
        <Text style={styles.radiusLabel}>Trigger Radius</Text>
        <View style={styles.radiusControls}>
          <TouchableOpacity
            onPress={() => adjustRadius(-1)}
            style={[styles.radiusButton, radius === RADIUS_OPTIONS[0] && styles.radiusButtonDisabled]}
            disabled={radius === RADIUS_OPTIONS[0]}
            activeOpacity={0.7}
          >
            <Minus size={20} color={radius === RADIUS_OPTIONS[0] ? '#cbd5e1' : '#0ea5e9'} />
          </TouchableOpacity>

          <View style={styles.radiusValue}>
            <Text style={styles.radiusValueText}>{formatRadius(radius)}</Text>
          </View>

          <TouchableOpacity
            onPress={() => adjustRadius(1)}
            style={[styles.radiusButton, radius === RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1] && styles.radiusButtonDisabled]}
            disabled={radius === RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1]}
            activeOpacity={0.7}
          >
            <Plus size={20} color={radius === RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1] ? '#cbd5e1' : '#0ea5e9'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Location Display */}
      {selectedLocation && (
        <View style={styles.selectedLocationContainer}>
          <View style={styles.selectedLocationIcon}>
            <MapPin size={20} color="#0ea5e9" />
          </View>
          <View style={styles.selectedLocationText}>
            <Text style={styles.selectedLocationName} numberOfLines={1}>
              {selectedLocation.locationName}
            </Text>
            <Text style={styles.selectedLocationCoords}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 12,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 60,
    left: 4,
    right: 4,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: 200,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  predictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  predictionText: {
    flex: 1,
  },
  predictionMain: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  predictionSecondary: {
    fontSize: 13,
    color: '#64748b',
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  mapHint: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  mapHintText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  radiusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  radiusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radiusButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButtonDisabled: {
    backgroundColor: '#f1f5f9',
  },
  radiusValue: {
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  radiusValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bae6fd',
  },
  selectedLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 2,
  },
  selectedLocationCoords: {
    fontSize: 12,
    color: '#0369a1',
  },
});
