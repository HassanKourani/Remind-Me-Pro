# RemindMe Pro - Google Play Deployment Guide

## Prerequisites

Before deploying to Google Play, ensure you have:

1. **Expo Account** - Create at [expo.dev](https://expo.dev)
2. **EAS CLI** - Install with `npm install -g eas-cli`
3. **Google Play Console Account** - Register at [play.google.com/console](https://play.google.com/console)
4. **Google Service Account** - For automated submissions

---

## Step 1: Configure Expo Project

### 1.1 Login to EAS

```bash
eas login
```

### 1.2 Initialize EAS Project

```bash
eas init
```

This will:
- Create/update `app.json` with your EAS project ID
- Link your project to Expo servers

### 1.3 Update app.json

Replace `"your-project-id"` with your actual EAS project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

---

## Step 2: Set Up Google Play Console

### 2.1 Create App in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - App name: `RemindMe Pro`
   - Default language: English
   - App or Game: App
   - Free or Paid: Free (with in-app purchases)
4. Complete the declarations

### 2.2 Create Service Account for Automated Submissions

1. In Play Console, go to **Setup > API access**
2. Click **Create new service account**
3. Follow the link to Google Cloud Console
4. Create a service account with these roles:
   - Service Account User
   - Firebase App Distribution Admin (if using)
5. Create a JSON key and download it
6. Save as `google-service-account.json` in your project root
7. Back in Play Console, grant the service account access:
   - Click **Manage Play Console permissions**
   - Grant **Release to production** permission

⚠️ **Important**: Add `google-service-account.json` to `.gitignore`!

```bash
echo "google-service-account.json" >> .gitignore
```

---

## Step 3: Configure Environment Variables

### 3.1 Create Production .env

```bash
cp .env.example .env.production
```

Edit `.env.production`:

```env
# Supabase (Production)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# RevenueCat (Production)
EXPO_PUBLIC_REVENUECAT_API_KEY=your-production-revenuecat-key

# LocationIQ
EXPO_PUBLIC_LOCATIONIQ_API_KEY=your-locationiq-key
```

### 3.2 Set EAS Secrets (Recommended)

Instead of .env files, use EAS Secrets for production:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_API_KEY --value "your-key" --scope project
```

---

## Step 4: Set Up RevenueCat for Production

### 4.1 Create RevenueCat Project

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Create a new project
3. Add Android app with package name: `com.remindmepro.app`

### 4.2 Create Products in Google Play Console

1. Go to **Monetize > Products > Subscriptions**
2. Create subscriptions:
   - `remindme_pro_monthly` - Monthly subscription
   - `remindme_pro_yearly` - Annual subscription
3. Create in-app product:
   - `remindme_pro_lifetime` - Lifetime purchase

### 4.3 Connect RevenueCat to Play Store

1. In RevenueCat, go to your project settings
2. Add Google Play credentials
3. Upload your service account JSON or connect via API

### 4.4 Create Offerings

1. In RevenueCat, create an Offering called "default"
2. Add packages:
   - Monthly ($4.99)
   - Annual ($29.99)
   - Lifetime ($49.99)
3. Create entitlement "premium"
4. Attach products to the entitlement

---

## Step 5: Build for Production

### 5.1 Preview Build (Internal Testing)

```bash
eas build --platform android --profile preview
```

This creates an APK you can share with testers.

### 5.2 Production Build

```bash
eas build --platform android --profile production
```

This creates an AAB (Android App Bundle) for Play Store.

---

## Step 6: Submit to Google Play

### 6.1 First Submission (Manual)

For your first submission, manually upload the AAB:

1. Download the AAB from EAS Build dashboard
2. Go to Play Console > **Production** or **Internal testing**
3. Click **Create new release**
4. Upload the AAB file
5. Fill in release notes
6. Submit for review

### 6.2 Automated Submissions (Future)

After initial setup, use EAS Submit:

```bash
eas submit --platform android --profile production
```

This will:
- Download the latest build
- Upload to Play Console
- Create a release on the "internal" track

---

## Step 7: Store Listing

Complete these sections in Play Console:

### Main Store Listing
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (min 2, phone and tablet)
- [ ] Short description (80 chars max)
- [ ] Full description

### App Content
- [ ] Privacy policy URL
- [ ] App access (if app requires login)
- [ ] Ads declaration
- [ ] Content rating questionnaire
- [ ] Target audience
- [ ] News apps (select No)

### Pricing & Distribution
- [ ] Countries availability
- [ ] In-app purchases enabled

---

## Deployment Checklist

### Before First Release

- [ ] Expo project initialized with EAS
- [ ] Google Play Console app created
- [ ] Service account JSON configured
- [ ] RevenueCat production setup complete
- [ ] Products created in Play Console
- [ ] All environment variables set
- [ ] Privacy policy published
- [ ] App icon and screenshots ready

### For Each Release

1. [ ] Update version in `app.json` (or use autoIncrement)
2. [ ] Run tests: `npm test`
3. [ ] Build: `eas build --platform android --profile production`
4. [ ] Submit: `eas submit --platform android`
5. [ ] Add release notes in Play Console
6. [ ] Submit for review

---

## Useful Commands

```bash
# Check EAS configuration
eas config

# List all builds
eas build:list

# Check submission status
eas submit:list

# View credentials
eas credentials

# Update app version
eas build --auto-submit --platform android --profile production
```

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
eas build --clear-cache --platform android --profile production
```

### Service Account Issues

- Ensure service account has correct permissions
- Check that JSON file path is correct in `eas.json`
- Verify service account is linked in Play Console API access

### RevenueCat Not Loading Products

- Check API key is correct
- Verify products are active in Play Console
- Ensure offerings are configured in RevenueCat dashboard

---

## Support

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction)
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
