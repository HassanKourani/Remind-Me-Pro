import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0ea5e9', '#0284c7', '#0369a1']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By downloading, installing, or using RemindMe Pro ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            RemindMe Pro is a reminder application that helps users create and manage time-based and location-based reminders. The App offers both free and premium features.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            You may use the App as a guest or create an account. When creating an account, you agree to provide accurate information and keep your login credentials secure. You are responsible for all activities under your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Premium Subscription</Text>
          <Text style={styles.paragraph}>
            Premium features are available through in-app purchases. Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. You can manage subscriptions in your device's app store settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. User Conduct</Text>
          <Text style={styles.paragraph}>
            You agree not to misuse the App, attempt to gain unauthorized access, or use the App for any illegal purposes. We reserve the right to suspend or terminate accounts that violate these terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content, features, and functionality of the App are owned by RemindMe Pro and are protected by copyright, trademark, and other intellectual property laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Disclaimer of Warranties</Text>
          <Text style={styles.paragraph}>
            The App is provided "as is" without warranties of any kind. We do not guarantee that the App will be error-free or uninterrupted. Reminders are delivered on a best-effort basis and may be affected by device settings, network conditions, or other factors.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, RemindMe Pro shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the new terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, please contact us at support@remindmepro.app
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
});
