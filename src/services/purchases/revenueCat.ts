import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Key (test key for development)
const REVENUECAT_API_KEY = 'test_WHorijwalcpZyJjxfugQkaKLuOH';

// Entitlement ID - this should match what you set up in RevenueCat dashboard
const PREMIUM_ENTITLEMENT_ID = 'premium';

// Product identifiers - these should match your App Store / Play Store product IDs
export const PRODUCT_IDS = {
  MONTHLY: 'remindme_pro_monthly',
  YEARLY: 'remindme_pro_yearly',
  LIFETIME: 'remindme_pro_lifetime',
};

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  try {
    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure with API key
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId || null, // null for anonymous users
    });

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    throw error;
  }
}

/**
 * Login user to RevenueCat (call after user signs in)
 */
export async function loginRevenueCat(userId: string): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error('Failed to login to RevenueCat:', error);
    throw error;
  }
}

/**
 * Logout user from RevenueCat (call after user signs out)
 */
export async function logoutRevenueCat(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    console.error('Failed to logout from RevenueCat:', error);
    throw error;
  }
}

/**
 * Get available offerings/packages
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current !== null && offerings.current.availablePackages.length > 0) {
      return offerings.current;
    }

    return null;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    throw error;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(packageToPurchase: PurchasesPackage): Promise<{
  customerInfo: CustomerInfo;
  productIdentifier: string;
}> {
  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);
    return { customerInfo, productIdentifier };
  } catch (error: any) {
    if (error.userCancelled) {
      // User cancelled, don't throw error
      throw new Error('PURCHASE_CANCELLED');
    }
    console.error('Failed to purchase package:', error);
    throw error;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    throw error;
  }
}

/**
 * Check if user has premium entitlement
 */
export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return false;
  }
}

/**
 * Get active subscription info
 */
export async function getActiveSubscription(): Promise<{
  isActive: boolean;
  expirationDate: string | null;
  productIdentifier: string | null;
  willRenew: boolean;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];

    if (premiumEntitlement) {
      return {
        isActive: true,
        expirationDate: premiumEntitlement.expirationDate,
        productIdentifier: premiumEntitlement.productIdentifier,
        willRenew: premiumEntitlement.willRenew,
      };
    }

    return {
      isActive: false,
      expirationDate: null,
      productIdentifier: null,
      willRenew: false,
    };
  } catch (error) {
    console.error('Failed to get active subscription:', error);
    return {
      isActive: false,
      expirationDate: null,
      productIdentifier: null,
      willRenew: false,
    };
  }
}

/**
 * Listen for customer info updates
 */
export function addCustomerInfoUpdateListener(
  callback: (customerInfo: CustomerInfo) => void
): () => void {
  const listener = Purchases.addCustomerInfoUpdateListener(callback);
  return () => listener.remove();
}

/**
 * Map package type to display name
 */
export function getPackageDisplayName(packageType: string): string {
  switch (packageType) {
    case 'MONTHLY':
      return 'Monthly';
    case 'ANNUAL':
      return 'Yearly';
    case 'LIFETIME':
      return 'Lifetime';
    default:
      return packageType;
  }
}

/**
 * Format price with currency
 */
export function formatPrice(priceString: string): string {
  return priceString; // RevenueCat already provides formatted price
}
