# RemindMe Pro Testing Guide

## Quick Start

```bash
# Install test dependencies
npm install

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run E2E tests (requires Maestro CLI)
# Install: curl -Ls "https://get.maestro.mobile.dev" | bash
npm run test:e2e
```

## Test Structure

```
src/
├── __tests__/
│   ├── utils/
│   │   └── validation.test.ts    # Form validation, password strength
│   ├── services/
│   │   └── notifications.test.ts # Notification scheduling mocks
│   └── stores/
│       └── authStore.test.ts     # Auth state management
.maestro/
└── flows/
    ├── auth-guest-flow.yaml      # Guest mode E2E
    ├── auth-signup-flow.yaml     # Sign up validation E2E
    └── reminder-crud.yaml        # CRUD operations E2E
```

## Automated Tests

### ✅ Unit Tests (Jest)

| Category | Tests | Coverage |
|----------|-------|----------|
| Form Validation | Title, notes, radius, trigger type | Full |
| Password Strength | Weak/Fair/Good/Strong calculation | Full |
| Email Validation | Regex validation | Full |
| Auth State | Guest, sign in, sign out, connection | Full |
| Notification Scheduling | Schedule, cancel, permissions | Mocked |

### ✅ E2E Tests (Maestro)

| Flow | Description | Prerequisites |
|------|-------------|---------------|
| `auth-guest-flow` | Guest mode → create reminder → complete | Development build |
| `auth-signup-flow` | Sign up form validation | Development build |
| `reminder-crud` | Create, read, snooze, delete | Development build |

## Manual Testing Checklist

### 📱 Device Testing

#### Android Versions
- [ ] Android 10 (API 29)
- [ ] Android 11 (API 30)
- [ ] Android 12 (API 31)
- [ ] Android 13 (API 33)
- [ ] Android 14 (API 34)

#### Screen Sizes
- [ ] Small phone (< 360dp width)
- [ ] Normal phone (360-400dp)
- [ ] Large phone (> 400dp)
- [ ] Tablet (600dp+)

### 🔔 Notifications (MANUAL ONLY)

| Test | Steps | Expected |
|------|-------|----------|
| Scheduled delivery | Create reminder 2 min ahead, wait | Notification appears on time |
| App in foreground | Create reminder, keep app open | Banner notification appears |
| App in background | Create reminder, minimize app | System notification appears |
| App killed | Create reminder, force close app | Notification still fires |
| Tap notification | Tap notification | Opens reminder detail |
| Complete action | Tap "Complete" in notification | Reminder marked complete |
| Snooze action | Tap "Snooze" in notification | Rescheduled 10 min |

### 📍 Location (MANUAL ONLY - Requires Real Device)

| Test | Steps | Expected |
|------|-------|----------|
| Search location | Type "Starbucks" in picker | Results appear |
| Select from map | Tap on map | Marker appears, address shown |
| Current location | Tap location button | Map centers on you |
| Geofence enter | Create "on arrive" reminder, travel to location | Notification fires |
| Geofence exit | Create "on leave" reminder, leave location | Notification fires |
| Background trigger | Kill app, trigger geofence | Notification fires |

### 🔐 Authentication

| Test | Steps | Expected |
|------|-------|----------|
| Sign up | Fill form, submit | Account created, redirected |
| Sign up validation | Leave fields empty | Error messages shown |
| Sign in | Enter credentials | Logged in, see reminders |
| Sign in wrong password | Enter wrong password | Error message |
| Guest mode | Tap "Continue as Guest" | Home screen, guest banner |
| Guest upgrade | Settings → Create Account | Data migrates to new account |
| Sign out | Settings → Sign Out | Returns to welcome |
| Session restore | Close app, reopen | Still logged in |

### ☁️ Sync

| Test | Steps | Expected |
|------|-------|----------|
| Create online | Create reminder with internet | Syncs immediately |
| Create offline | Turn off WiFi, create reminder | Queued for sync |
| Sync on reconnect | Turn WiFi back on | Reminder syncs |
| Cross-device | Log in on 2nd device | See all reminders |
| Delete sync | Delete reminder | Removed from all devices |

### 🧪 Edge Cases

| Test | Steps | Expected |
|------|-------|----------|
| Long title | Enter 200 char title | Accepts, displays truncated |
| Special characters | Use emoji, unicode in title | Displays correctly |
| Rapid actions | Complete/uncomplete rapidly | No crashes, correct state |
| No network at launch | Start app offline | Works, shows offline badge |
| Low memory | Use app with many bg apps | Doesn't crash |
| Orientation change | Rotate device | Layout adjusts (if supported) |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### Maestro Cloud (Optional)

```bash
# Upload E2E tests to run on real devices
maestro cloud --apiKey $MAESTRO_API_KEY .maestro/flows/
```

## Known Limitations

1. **Notifications**: Cannot fully automate notification delivery testing - OS controls timing
2. **Location**: Geofence testing requires physical movement or GPS spoofing
3. **Background tasks**: Behavior varies by Android version and OEM
4. **Expo Go**: Some features (background location) only work in development builds

## Pre-Release Checklist

Before each release:

- [ ] All unit tests pass (`npm test`)
- [ ] E2E smoke test passes (`npm run test:e2e:guest`)
- [ ] Manual notification test on Android 12+
- [ ] Manual location test (if changed)
- [ ] Test guest → account migration
- [ ] Test offline → online sync
- [ ] Test on at least 2 different Android versions
