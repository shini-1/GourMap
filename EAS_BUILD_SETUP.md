# 🚀 EAS Build Setup — GourMap

Complete guide for building GourMap with Expo Application Services (EAS).

---

## Architecture Overview

```
Local Dev  ──push──▶  GitHub Actions  ──eas build──▶  Expo Build Servers
                            │                                   │
                      validates TS                    uses EAS Secrets
                                                      outputs APK / AAB
```

| Profile      | Trigger                  | Output       | Distribution |
|--------------|--------------------------|--------------|--------------|
| `development`| Manual (`eas build -p dev`)| APK + iOS sim| Internal     |
| `preview`    | Push to `main`           | APK          | Internal     |
| `production` | Tag `v*.*.*`             | AAB          | Store        |

---

## Step 1 — Prerequisites

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in with your Expo account
eas login

# Verify project link (projectId already set in app.json)
eas project:info
```

---

## Step 2 — Configure EAS Project Secrets

EAS Secrets are build-time env vars stored securely on Expo's servers.  
They are **not** stored in your repo.

### Option A — Run the setup script (recommended)

```bash
bash scripts/setup-eas-secrets.sh
```

### Option B — Set secrets manually

```bash
# Supabase
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://hiioeustuvxgyoezweyp.supabase.co" --force

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<your-anon-key>" --force

# Mapbox — SECRET downloads token (sk.*), NOT the public pk.* token
eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN \
  --value "<your-secret-mapbox-token>" --force
```

### Verify secrets are set

```bash
eas secret:list
```

---

## Step 3 — Add GitHub Secret (for CI/CD)

Only **one** GitHub secret is needed — the rest live in EAS.

1. Generate an Expo access token:  
   → <https://expo.dev/accounts/shini-1/settings/access-tokens>

2. Add it to GitHub:  
   → <https://github.com/shini-1/GourMap/settings/secrets/actions>  
   **Name:** `EXPO_TOKEN`  
   **Value:** `<your-expo-access-token>`

---

## Step 4 — Build Profiles Reference

### `development` — local dev with dev client
```bash
eas build --platform android --profile development
```
- Includes `expo-dev-client` for fast refresh + native debugging
- Android: debug APK; iOS: simulator build

### `preview` — shareable test build
```bash
eas build --platform android --profile preview
```
- Android APK — install directly on device
- Edge Functions **disabled** (`EXPO_PUBLIC_USE_EDGE_FUNCTIONS=false`)
- Triggered automatically on every push to `main`

### `production` — store-ready build
```bash
eas build --platform android --profile production
```
- Android AAB — upload to Google Play
- Edge Functions **enabled** (`EXPO_PUBLIC_USE_EDGE_FUNCTIONS=true`)
- Triggered automatically on tags matching `v*.*.*`

---

## Step 5 — CI/CD Workflow

The workflow at `.github/workflows/build.yml` runs three jobs:

```
push / PR ──▶ validate (TypeScript check)
                  │
              ┌───┴────────────────────────┐
          push to main              tag v*.*.*
              │                          │
     eas-preview (APK)        eas-production (AAB)
```

### Trigger a production build via tag

```bash
git tag v1.10.0
git push origin v1.10.0
```

---

## Step 6 — EAS Update (OTA)

`runtimeVersion` is now set in `app.json` (policy: `appVersion`).  
This scopes OTA updates to binaries with a matching app version.

```bash
# Push an OTA update to the preview channel
eas update --channel preview --message "Fix: map pin offset"

# Push to production
eas update --channel production --message "Fix: search results"
```

> **Note:** OTA updates only work for JS/asset changes — native code changes require a new binary build.

---

## Troubleshooting

### `eas build` fails with "missing MAPBOX_DOWNLOADS_TOKEN"
```bash
eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN --value "sk...." --force
```

### Build fails with "Unauthorized" on Expo servers
- Verify `EXPO_TOKEN` is set correctly in GitHub Secrets
- Check it hasn't expired at <https://expo.dev/accounts/shini-1/settings/access-tokens>

### TypeScript check fails in CI
```bash
# Run locally first
npx tsc --noEmit
```

### Preview build not triggering
- Confirm `EXPO_TOKEN` GitHub secret exists
- Check the Actions tab for the `validate` job — `eas-preview` only runs after it passes

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `eas build -p android --profile preview` | Manual preview APK |
| `eas build -p android --profile production` | Manual production AAB |
| `eas build:list` | View all builds |
| `eas update --channel preview` | Push OTA update |
| `eas secret:list` | List EAS secrets |
| `eas whoami` | Verify login |

**EAS Dashboard:** <https://expo.dev/accounts/shini-1/projects/GourMap/builds>
