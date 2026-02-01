import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.paragraph}>
            RemindMe Pro ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.subTitle}>Account Information</Text>
          <Text style={styles.paragraph}>
            When you create an account, we collect your email address and display name. This information is used to authenticate you and sync your reminders across devices.
          </Text>

          <Text style={styles.subTitle}>Reminder Data</Text>
          <Text style={styles.paragraph}>
            We store the reminders you create, including titles, notes, times, and locations. This data is stored securely and is only accessible to you.
          </Text>

          <Text style={styles.subTitle}>Location Data</Text>
          <Text style={styles.paragraph}>
            If you enable location-based reminders, we collect location data to trigger reminders when you enter or leave specified areas. Location data is processed locally on your device and only coordinates of your saved locations are stored.
          </Text>

          <Text style={styles.subTitle}>Device Information</Text>
          <Text style={styles.paragraph}>
            We collect basic device information for analytics and to improve app performance. This includes device type, operating system version, and crash reports.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.bulletPoint}>• To provide and maintain the App's functionality</Text>
          <Text style={styles.bulletPoint}>• To sync your reminders across devices</Text>
          <Text style={styles.bulletPoint}>• To send you reminder notifications</Text>
          <Text style={styles.bulletPoint}>• To process premium subscriptions</Text>
          <Text style={styles.bulletPoint}>• To improve our services and user experience</Text>
          <Text style={styles.bulletPoint}>• To respond to your support requests</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage and Security</Text>
          <Text style={styles.paragraph}>
            Your data is stored securely using industry-standard encryption. We use Supabase for cloud storage, which provides enterprise-grade security. Guest users' data is stored locally on their device only.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We use the following third-party services:
          </Text>
          <Text style={styles.bulletPoint}>• Supabase - For authentication and data storage</Text>
          <Text style={styles.bulletPoint}>• RevenueCat - For subscription management</Text>
          <Text style={styles.bulletPoint}>• Expo - For push notifications</Text>
          <Text style={styles.paragraph}>
            These services have their own privacy policies governing their use of your data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.bulletPoint}>• Access your personal data</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate data</Text>
          <Text style={styles.bulletPoint}>• Delete your account and data</Text>
          <Text style={styles.bulletPoint}>• Export your data</Text>
          <Text style={styles.bulletPoint}>• Opt out of analytics</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your data as long as your account is active. If you delete your account, your data will be permanently removed within 30 days.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our App is not intended for children under 13. We do not knowingly collect personal information from children under 13.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy in the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or your data, please contact us at:
          </Text>
          <Text style={styles.contactEmail}>privacy@remindmepro.app</Text>
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
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 28,
    paddingLeft: 8,
  },
  contactEmail: {
    fontSize: 15,
    color: '#0ea5e9',
    fontWeight: '600',
    marginTop: 8,
  },
});
