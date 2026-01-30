import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { X, Check, MapPin, Bell, Share2, Infinity, Crown, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/Button';

const FEATURES = [
  {
    icon: MapPin,
    title: 'Location Reminders',
    description: 'Get reminded when you arrive or leave places',
    color: '#10b981',
  },
  {
    icon: Bell,
    title: 'Custom Alarms',
    description: 'Choose from multiple alarm sounds',
    color: '#0ea5e9',
  },
  {
    icon: Share2,
    title: 'Quick Share',
    description: 'Share reminders to WhatsApp or SMS',
    color: '#8b5cf6',
  },
  {
    icon: Infinity,
    title: 'Unlimited Reminders',
    description: 'No limits on how many reminders you can create',
    color: '#f59e0b',
  },
];

const PRODUCTS = [
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
  const [selectedProductId, setSelectedProductId] = useState('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);

    // Simulate purchase - in real app, this would use RevenueCat
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Demo Mode',
        'In-app purchases are not configured yet. This is a demo of the premium flow.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 1500);
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'No previous purchases found to restore.',
      [{ text: 'OK' }]
    );
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

          {PRODUCTS.map((product) => {
            const isSelected = product.id === selectedProductId;

            return (
              <TouchableOpacity
                key={product.id}
                onPress={() => setSelectedProductId(product.id)}
                style={[
                  styles.productCard,
                  isSelected && styles.productCardActive,
                ]}
                activeOpacity={0.7}
              >
                {product.badge && (
                  <View style={[styles.productBadge, product.id === 'lifetime' ? styles.bestValueBadge : styles.saveBadge]}>
                    <Text style={styles.productBadgeText}>{product.badge}</Text>
                  </View>
                )}

                <View style={styles.productRow}>
                  <View style={styles.productLeft}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View>
                      <Text style={[styles.productName, isSelected && styles.productNameActive]}>
                        {product.name}
                      </Text>
                      <Text style={styles.productDescription}>{product.description}</Text>
                    </View>
                  </View>
                  <View style={styles.productPriceContainer}>
                    <Text style={[styles.productPrice, isSelected && styles.productPriceActive]}>
                      {product.price}
                    </Text>
                    {product.period && (
                      <Text style={styles.productPeriod}>{product.period}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          onPress={handlePurchase}
          style={styles.upgradeButton}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.upgradeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Zap size={20} color="#ffffff" />
            <Text style={styles.upgradeText}>
              {isLoading ? 'Processing...' : 'Upgrade Now'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Cancel anytime. Recurring billing. Terms apply.
        </Text>
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
  termsText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
});
