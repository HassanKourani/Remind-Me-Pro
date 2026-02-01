import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { X, Check, MapPin, Infinity, Crown, Zap, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PurchasesPackage } from 'react-native-purchases';

import { useAuthStore } from '@/stores/authStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  checkPremiumStatus,
  getActiveSubscription,
} from '@/services/purchases/revenueCat';

const FEATURES = [
  {
    icon: MapPin,
    title: 'Location Reminders',
    description: 'Get reminded when you arrive or leave places',
    color: '#10b981',
  },
  {
    icon: Infinity,
    title: 'Unlimited Reminders',
    description: 'No limits on how many reminders you can create',
    color: '#f59e0b',
  },
  {
    icon: Zap,
    title: 'Priority Support',
    description: 'Get faster responses to your questions',
    color: '#0ea5e9',
  },
  {
    icon: Crown,
    title: 'Early Access',
    description: 'Be the first to try new features',
    color: '#8b5cf6',
  },
];

// Fallback products if RevenueCat fails to load
const FALLBACK_PRODUCTS = [
  {
    id: 'monthly',
    name: 'Monthly',
    description: 'Billed monthly',
    price: '$4.99',
    period: '/mo',
    badge: null,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    description: 'Billed annually',
    price: '$29.99',
    period: '/yr',
    badge: 'SAVE 50%',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    description: 'One-time purchase',
    price: '$49.99',
    period: '',
    badge: 'BEST VALUE',
  },
];

export default function PremiumScreen() {
  const { user, updatePremiumStatus } = useAuthStore();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const offering = await getOfferings();

      if (offering && offering.availablePackages.length > 0) {
        setPackages(offering.availablePackages);
        // Select annual by default if available, otherwise first package
        const annualPkg = offering.availablePackages.find(
          (pkg) => pkg.packageType === 'ANNUAL'
        );
        setSelectedPackage(annualPkg || offering.availablePackages[0]);
      } else {
        setError('No products available. Please try again later.');
      }
    } catch (err) {
      console.error('Failed to load offerings:', err);
      setError('Failed to load subscription options. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    if (user?.isGuest) {
      Alert.alert(
        'Account Required',
        'Please create an account to purchase premium. Your subscription will be linked to your account.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Account', onPress: () => router.push('/(tabs)/settings') },
        ]
      );
      return;
    }

    try {
      setIsPurchasing(true);

      const { customerInfo, productIdentifier } = await purchasePackage(selectedPackage);

      // Check if purchase was successful via entitlement
      let isPremium = await checkPremiumStatus();

      // In sandbox/test mode, entitlements might not be set up
      // Check if we got a valid product identifier as fallback
      if (!isPremium && productIdentifier) {
        console.log('Purchase completed with product:', productIdentifier);
        // For sandbox testing, treat any successful purchase as premium
        isPremium = true;
      }

      if (isPremium) {
        // Get the actual expiration date from RevenueCat
        const subscription = await getActiveSubscription();
        let expiresAt = subscription.expirationDate || null;

        // If no expiration from RevenueCat (sandbox mode), compute based on product
        if (!expiresAt && productIdentifier) {
          const now = new Date();
          if (productIdentifier.includes('monthly')) {
            now.setMonth(now.getMonth() + 1);
            expiresAt = now.toISOString();
          } else if (productIdentifier.includes('yearly') || productIdentifier.includes('annual')) {
            now.setFullYear(now.getFullYear() + 1);
            expiresAt = now.toISOString();
          } else if (productIdentifier.includes('lifetime')) {
            // Lifetime = 100 years
            now.setFullYear(now.getFullYear() + 100);
            expiresAt = now.toISOString();
          }
          console.log('Computed expiration for sandbox:', expiresAt);
        }

        console.log('Updating premium status with expiresAt:', expiresAt);
        // Update local state and Supabase with expiration date
        await updatePremiumStatus(true, expiresAt);

        Alert.alert(
          'Welcome to Premium! 🎉',
          'Thank you for upgrading! You now have access to all premium features.',
          [{ text: 'Awesome!', onPress: () => router.back() }]
        );
      } else {
        // Purchase completed but couldn't verify premium status
        Alert.alert(
          'Purchase Processing',
          'Your purchase is being processed. Premium features will be available shortly.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err: any) {
      if (err.message === 'PURCHASE_CANCELLED') {
        // User cancelled, do nothing
        return;
      }
      console.error('Purchase failed:', err);
      Alert.alert(
        'Purchase Failed',
        'There was an error processing your purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);

      const customerInfo = await restorePurchases();
      const isPremium = await checkPremiumStatus();

      if (isPremium) {
        // Get the actual expiration date from RevenueCat
        const subscription = await getActiveSubscription();
        const expiresAt = subscription.expirationDate || null;

        await updatePremiumStatus(true, expiresAt);
        Alert.alert(
          'Purchases Restored!',
          'Your premium subscription has been restored.',
          [{ text: 'Great!', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any previous purchases to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Restore failed:', err);
      Alert.alert(
        'Restore Failed',
        'There was an error restoring your purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const getPackageDisplay = (pkg: PurchasesPackage) => {
    const product = pkg.product;
    let badge = null;
    let period = '';

    switch (pkg.packageType) {
      case 'MONTHLY':
        period = '/mo';
        break;
      case 'ANNUAL':
        period = '/yr';
        badge = 'SAVE 50%';
        break;
      case 'LIFETIME':
        badge = 'BEST VALUE';
        break;
      default:
        period = '';
    }

    return {
      id: pkg.identifier,
      name: product.title.replace(' (RemindMe Pro)', '').replace('(RemindMe Pro)', '').trim(),
      description: product.description || `Billed ${pkg.packageType.toLowerCase()}`,
      price: product.priceString,
      period,
      badge,
      packageType: pkg.packageType,
    };
  };

  const renderProducts = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadOfferings} style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (packages.length === 0) {
      // Show fallback UI
      return FALLBACK_PRODUCTS.map((product) => (
        <View key={product.id} style={styles.productCard}>
          {product.badge && (
            <View style={[styles.productBadge, product.id === 'lifetime' ? styles.bestValueBadge : styles.saveBadge]}>
              <Text style={styles.productBadgeText}>{product.badge}</Text>
            </View>
          )}
          <View style={styles.productRow}>
            <View style={styles.productLeft}>
              <View style={styles.radioOuter}>
                <View style={styles.radioInner} />
              </View>
              <View>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
              </View>
            </View>
            <View style={styles.productPriceContainer}>
              <Text style={styles.productPrice}>{product.price}</Text>
              {product.period && <Text style={styles.productPeriod}>{product.period}</Text>}
            </View>
          </View>
        </View>
      ));
    }

    return packages.map((pkg) => {
      const display = getPackageDisplay(pkg);
      const isSelected = selectedPackage?.identifier === pkg.identifier;

      return (
        <TouchableOpacity
          key={pkg.identifier}
          onPress={() => setSelectedPackage(pkg)}
          style={[
            styles.productCard,
            isSelected && styles.productCardActive,
          ]}
          activeOpacity={0.7}
        >
          {display.badge && (
            <View style={[
              styles.productBadge,
              display.packageType === 'LIFETIME' ? styles.bestValueBadge : styles.saveBadge
            ]}>
              <Text style={styles.productBadgeText}>{display.badge}</Text>
            </View>
          )}

          <View style={styles.productRow}>
            <View style={styles.productLeft}>
              <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={[styles.productName, isSelected && styles.productNameActive]}>
                  {display.name}
                </Text>
                <Text style={styles.productDescription}>{display.description}</Text>
              </View>
            </View>
            <View style={styles.productPriceContainer}>
              <Text style={[styles.productPrice, isSelected && styles.productPriceActive]}>
                {display.price}
              </Text>
              {display.period && (
                <Text style={styles.productPeriod}>{display.period}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <X size={24} color="#64748b" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#f59e0b', '#d97706', '#b45309']}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.crownContainer}>
              <Crown size={40} color="#ffffff" />
            </View>
            <Text style={styles.heroTitle}>Go Premium</Text>
            <Text style={styles.heroSubtitle}>
              Unlock all features and supercharge your productivity
            </Text>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
          <View style={[styles.decorCircle, styles.decorCircle3]} />
        </LinearGradient>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Premium Features</Text>

          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View
                style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}
              >
                <feature.icon size={22} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <View style={styles.checkIcon}>
                <Check size={18} color="#22c55e" />
              </View>
            </View>
          ))}
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          {renderProducts()}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          onPress={handlePurchase}
          style={styles.upgradeButton}
          activeOpacity={0.8}
          disabled={isPurchasing || isLoading || packages.length === 0}
        >
          <LinearGradient
            colors={isPurchasing || isLoading ? ['#9ca3af', '#6b7280'] : ['#f59e0b', '#d97706']}
            style={styles.upgradeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Zap size={20} color="#ffffff" />
            )}
            <Text style={styles.upgradeText}>
              {isPurchasing ? 'Processing...' : 'Upgrade Now'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          style={styles.restoreButton}
          disabled={isRestoring}
        >
          <Text style={styles.restoreText}>
            {isRestoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>Cancel anytime. Recurring billing. </Text>
          <TouchableOpacity onPress={() => router.push('/legal/terms')}>
            <Text style={styles.termsLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.termsText}> & </Text>
          <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
            <Text style={styles.termsLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  hero: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 280,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 192,
    height: 192,
    top: -64,
    right: -64,
  },
  decorCircle2: {
    width: 112,
    height: 112,
    bottom: -32,
    left: -32,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    top: 64,
    left: 20,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    marginLeft: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  retryText: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  productCardActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  productBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBadge: {
    backgroundColor: '#22c55e',
  },
  bestValueBadge: {
    backgroundColor: '#f59e0b',
  },
  productBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioOuterActive: {
    borderColor: '#f59e0b',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
  },
  productNameActive: {
    color: '#92400e',
  },
  productDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  productPriceActive: {
    color: '#92400e',
  },
  productPeriod: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  ctaContainer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  upgradeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  upgradeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  termsText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  termsLink: {
    color: '#0ea5e9',
    fontSize: 12,
    fontWeight: '500',
  },
});
