import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Cooldown duration in milliseconds (5 minutes)
const AD_COOLDOWN_MS = 5 * 60 * 1000;

// Storage key for last ad shown timestamp
const LAST_AD_SHOWN_KEY = '@remindme_last_ad_shown';

// Flag to check if ads module is available
let adsAvailable = false;
let interstitialAd: any = null;
let isAdLoaded = false;
let isAdLoading = false;
let AdEventType: any = null;

// Use test IDs in development, real IDs in production
const INTERSTITIAL_AD_UNIT_ID_PROD = 'ca-app-pub-5224347803460342/3263915287';

/**
 * Check if we're running in Expo Go
 */
function isExpoGo(): boolean {
  // @ts-ignore
  return typeof expo !== 'undefined' && expo?.modules?.ExpoGo;
}

/**
 * Initialize and preload the interstitial ad
 */
export function initializeAds(): void {
  // Skip ads initialization entirely in Expo Go
  if (__DEV__) {
    // Try to detect Expo Go by checking for native module
    try {
      const { NativeModules } = require('react-native');
      if (!NativeModules.RNGoogleMobileAdsModule) {
        console.log('Ads: Native module not available (Expo Go detected), skipping initialization');
        adsAvailable = false;
        return;
      }
    } catch {
      console.log('Ads: Could not check for native module, skipping');
      adsAvailable = false;
      return;
    }
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { InterstitialAd, AdEventType: AET, TestIds } = adsModule;
    AdEventType = AET;

    const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : INTERSTITIAL_AD_UNIT_ID_PROD;

    // Create the interstitial ad instance
    interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // Set up event listeners
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded');
      isAdLoaded = true;
      isAdLoading = false;
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.log('Interstitial ad failed to load:', error);
      isAdLoaded = false;
      isAdLoading = false;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Interstitial ad closed');
      isAdLoaded = false;
      // Preload the next ad
      loadInterstitialAd();
    });

    adsAvailable = true;

    // Load the first ad
    loadInterstitialAd();

    console.log('Ads initialized successfully');
  } catch (error) {
    console.log('Ads initialization skipped (expected in Expo Go)');
    adsAvailable = false;
  }
}

/**
 * Load an interstitial ad
 */
export function loadInterstitialAd(): void {
  if (!adsAvailable || !interstitialAd) {
    return;
  }

  if (isAdLoading || isAdLoaded) {
    return;
  }

  try {
    isAdLoading = true;
    interstitialAd.load();
  } catch (error) {
    console.log('Failed to load ad:', error);
    isAdLoading = false;
  }
}

/**
 * Check if cooldown has passed since last ad
 */
async function hasCooldownPassed(): Promise<boolean> {
  try {
    const lastAdShown = await AsyncStorage.getItem(LAST_AD_SHOWN_KEY);

    if (!lastAdShown) {
      return true; // No ad shown yet
    }

    const lastAdTime = parseInt(lastAdShown, 10);
    const now = Date.now();

    return (now - lastAdTime) >= AD_COOLDOWN_MS;
  } catch (error) {
    console.error('Error checking ad cooldown:', error);
    return true; // Show ad on error to be safe
  }
}

/**
 * Record that an ad was just shown
 */
async function recordAdShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_AD_SHOWN_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error recording ad shown:', error);
  }
}

/**
 * Show interstitial ad if:
 * - User is not premium
 * - Cooldown has passed
 * - Ad is loaded
 *
 * @param isPremium - Whether the user has premium status
 * @returns Promise<boolean> - Whether an ad was shown
 */
export async function showInterstitialAd(isPremium: boolean): Promise<boolean> {
  // Don't show ads if module is not available
  if (!adsAvailable || !interstitialAd) {
    return false;
  }

  // Don't show ads to premium users
  if (isPremium) {
    console.log('User is premium, skipping ad');
    return false;
  }

  // Check cooldown
  const cooldownPassed = await hasCooldownPassed();
  if (!cooldownPassed) {
    console.log('Ad cooldown has not passed yet');
    return false;
  }

  // Check if ad is loaded
  if (!isAdLoaded) {
    console.log('No ad loaded, attempting to load');
    loadInterstitialAd();
    return false;
  }

  try {
    // Show the ad
    await interstitialAd.show();
    // Record that we showed an ad
    await recordAdShown();
    return true;
  } catch (error) {
    console.error('Error showing interstitial ad:', error);
    return false;
  }
}

/**
 * Get remaining cooldown time in seconds
 */
export async function getRemainingCooldown(): Promise<number> {
  try {
    const lastAdShown = await AsyncStorage.getItem(LAST_AD_SHOWN_KEY);

    if (!lastAdShown) {
      return 0;
    }

    const lastAdTime = parseInt(lastAdShown, 10);
    const now = Date.now();
    const elapsed = now - lastAdTime;
    const remaining = AD_COOLDOWN_MS - elapsed;

    return Math.max(0, Math.ceil(remaining / 1000));
  } catch (error) {
    return 0;
  }
}

/**
 * Clean up ad listeners
 */
export function cleanupAds(): void {
  try {
    if (adsAvailable && interstitialAd) {
      interstitialAd.removeAllListeners();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}
