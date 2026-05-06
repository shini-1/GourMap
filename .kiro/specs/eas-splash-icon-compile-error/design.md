# EAS Splash Icon Compile Error — Bugfix Design

## Overview

The EAS Build for Android fails during resource compilation because the splash icon PNG file (`assets/splash-icon.png`) generates an AAPT-incompatible resource file when processed by Expo. The error occurs in the `:app:mergeReleaseResources` Gradle task when AAPT attempts to compile `drawable-mdpi/assets_splashicon.png`.

The fix involves one of the following approaches:
1. **Replace the splash icon file** with a new, AAPT-compatible PNG (most likely fix)
2. **Optimize/re-export the existing splash icon** to remove any corruption or incompatible metadata
3. **Use a different splash screen configuration** (e.g., switch to `expo-splash-screen` native module if the issue persists)

The most probable root cause is that `assets/splash-icon.png` contains metadata, color profiles, or encoding that AAPT cannot process. Re-exporting the image as a clean, standard PNG should resolve the issue.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — AAPT fails to compile `drawable-mdpi/assets_splashicon.png` during the `:app:mergeReleaseResources` Gradle task, aborting the EAS Build.
- **Property (P)**: The desired behavior — the EAS Build SHALL successfully compile all Android resources and produce a signed APK.
- **Preservation**: The splash screen SHALL continue to display correctly on app launch with the same visual appearance and configuration.
- **AAPT (Android Asset Packaging Tool)**: The Android SDK tool that compiles resources (images, layouts, etc.) into the APK. AAPT2 is the current version used by modern Android builds.
- **`drawable-mdpi`**: Android resource directory for medium-density (160dpi) screen assets. Expo generates density-specific versions of the splash icon for mdpi, hdpi, xhdpi, xxhdpi, and xxxhdpi.
- **`assets/splash-icon.png`**: The source splash screen image referenced in `app.json` under `expo.splash.image`.
- **`expo-splash-screen`**: Expo's native module for managing splash screens. An alternative to the legacy `expo.splash` configuration in `app.json`.
- **PNG metadata**: Embedded data in PNG files such as color profiles (ICC), gamma correction (gAMA), or text chunks (tEXt) that can cause compatibility issues with AAPT.
- **Interlaced PNG**: A PNG encoding mode that can sometimes cause AAPT compilation failures. Non-interlaced (progressive) encoding is recommended for Android resources.

---

## Bug Details

### Bug Condition

The bug manifests during every EAS Build attempt for Android production builds. The Gradle build process reaches the `:app:mergeReleaseResources` task, which invokes AAPT2 to compile all drawable resources. When AAPT2 processes `drawable-mdpi/assets_splashicon.png` (generated from `assets/splash-icon.png`), it fails with "file failed to compile" and aborts the entire build.

**Formal Specification:**
```
FUNCTION isBugCondition(buildRun)
  INPUT: buildRun — an EAS Build run for Android platform
  OUTPUT: boolean

  RETURN buildRun.platform == "android"
         AND buildRun.profile == "production"
         AND buildRun.gradleTask == ":app:mergeReleaseResources"
         AND buildRun.error CONTAINS "AAPT: error: file failed to compile"
         AND buildRun.error CONTAINS "drawable-mdpi/assets_splashicon.png"
END FUNCTION
```

### Examples

- **EAS Build for Android production (current behavior)**: Build reaches `:app:mergeReleaseResources`, AAPT fails on `drawable-mdpi/assets_splashicon.png`, build aborts. `isBugCondition` returns `true`.
- **EAS Build for Android production (after fix)**: Build reaches `:app:mergeReleaseResources`, AAPT successfully compiles all resources, build completes and produces APK. `isBugCondition` returns `false`.
- **Local development build**: App runs successfully with splash screen displayed correctly. This is NOT a bug condition — the issue only manifests during EAS cloud builds.
- **EAS Build for iOS**: Build completes successfully. `isBugCondition` returns `false` (iOS does not use AAPT).
- **Web build**: Build completes successfully. `isBugCondition` returns `false` (web does not use AAPT).

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The splash screen MUST continue to display on app launch with the same visual appearance (image, background color, resize mode).
- The `app.json` configuration for `expo.splash.image`, `expo.splash.resizeMode`, and `expo.splash.backgroundColor` MUST remain unchanged.
- Other Android resources (app icon, adaptive icon) MUST continue to compile successfully.
- iOS and web builds MUST continue to work without any splash screen issues.
- Local development builds MUST continue to display the splash screen correctly.

**Scope:**
All app behavior that does NOT involve the Android resource compilation process must be completely unaffected by this fix. This includes:
- Splash screen visual appearance and behavior
- App icon and adaptive icon
- iOS and web platform builds
- Local development workflow

---

## Hypothesized Root Cause

Based on the AAPT error message and the fact that the issue only occurs during EAS cloud builds (not local development), the most likely root causes are:

### Hypothesis 1: PNG Metadata Incompatibility (Most Likely)

The `assets/splash-icon.png` file contains PNG metadata chunks (e.g., ICC color profile, gAMA, tEXt) that AAPT2 cannot process. This is a common issue with PNG files exported from certain image editors (e.g., Photoshop, GIMP) that embed extensive metadata.

**Evidence:**
- AAPT errors with "file failed to compile" typically indicate metadata or encoding issues rather than image corruption.
- The file works in local development (React Native's Metro bundler is more lenient) but fails in AAPT (stricter validation).
- The error occurs specifically in the `drawable-mdpi` directory, which is generated by Expo's image processing pipeline.

**Fix:** Re-export `assets/splash-icon.png` as a clean PNG with minimal metadata using a tool like `pngcrush`, `optipng`, or an online PNG optimizer.

### Hypothesis 2: Interlaced PNG Encoding

The PNG file uses interlaced encoding, which AAPT2 sometimes rejects. Android resources should use non-interlaced (progressive) encoding.

**Evidence:**
- Interlaced PNGs are known to cause AAPT compilation failures in some Android SDK versions.
- The error message does not provide specific details, which is consistent with encoding-related issues.

**Fix:** Re-export the PNG with interlacing disabled.

### Hypothesis 3: Image Corruption or Invalid PNG Structure

The PNG file is corrupted or has an invalid structure (e.g., incorrect chunk ordering, missing IEND chunk).

**Evidence:**
- AAPT's "file failed to compile" error can indicate structural issues.
- However, if the file were truly corrupted, it would likely fail to display in local development as well.

**Fix:** Re-create the splash icon from the original source file or use a PNG repair tool.

### Hypothesis 4: File Name or Path Issue

The generated file name `assets_splashicon.png` (with underscore) might conflict with Android resource naming conventions, though this is unlikely since Expo's build system should handle this correctly.

**Evidence:**
- Android resource names must be lowercase and use underscores or hyphens, which `assets_splashicon.png` satisfies.
- This is the least likely cause.

**Fix:** Rename `assets/splash-icon.png` to `assets/splash.png` to simplify the generated resource name.

---

## Correctness Properties

### Property 1: Bug Condition — AAPT Successfully Compiles Splash Icon Resources

_For any_ EAS Build run for Android production where the bug condition previously held (AAPT failed on `drawable-mdpi/assets_splashicon.png`), the fixed build SHALL successfully compile all splash icon resources in all density directories (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) and complete the APK build without AAPT errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 2: Preservation — Splash Screen Visual Appearance Unchanged

_For any_ app launch on an Android device after the fix is applied, the splash screen SHALL display with the same visual appearance (image content, background color, resize mode) as before the fix. The only change is the underlying PNG file encoding/metadata, not the visual content.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

The fix involves replacing or re-exporting the `assets/splash-icon.png` file to ensure AAPT compatibility. The specific approach depends on the root cause:

**Approach 1: Re-export PNG with Minimal Metadata (Recommended)**

1. Open `assets/splash-icon.png` in an image editor (e.g., GIMP, Photoshop, or online tool)
2. Export/Save As PNG with the following settings:
   - **Interlacing**: Disabled (non-interlaced)
   - **Color profile**: Do not embed ICC profile (or use sRGB)
   - **Metadata**: Remove all metadata chunks (gAMA, tEXt, etc.)
   - **Compression**: Standard PNG compression (level 6-9)
3. Replace the existing `assets/splash-icon.png` with the re-exported file
4. Verify the file size is reasonable (should be similar to or smaller than the original)
5. Test locally to ensure the splash screen still displays correctly
6. Trigger an EAS Build and verify AAPT compilation succeeds

**Approach 2: Optimize PNG with Command-Line Tools**

If re-exporting manually does not resolve the issue, use PNG optimization tools:

```bash
# Install pngcrush (macOS)
brew install pngcrush

# Optimize the PNG (removes metadata, ensures AAPT compatibility)
pngcrush -rem allb -reduce assets/splash-icon.png assets/splash-icon-optimized.png

# Replace the original file
mv assets/splash-icon-optimized.png assets/splash-icon.png
```

Alternatively, use `optipng`:

```bash
# Install optipng (macOS)
brew install optipng

# Optimize in-place
optipng -o7 -strip all assets/splash-icon.png
```

**Approach 3: Recreate Splash Icon from Source**

If the PNG file is corrupted or the above approaches fail:

1. Locate the original source file (e.g., PSD, AI, SVG) for the splash icon
2. Export a new PNG at the required resolution (typically 1242x2436 for iOS, Android will scale)
3. Use the export settings from Approach 1 (no interlacing, no metadata)
4. Replace `assets/splash-icon.png` with the new file

**Approach 4: Rename File (Fallback)**

If the issue is related to the file name:

1. Rename `assets/splash-icon.png` to `assets/splash.png`
2. Update `app.json`: change `"splash": { "image": "./assets/splash-icon.png" }` to `"splash": { "image": "./assets/splash.png" }`
3. Test locally and trigger an EAS Build

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists by attempting an EAS Build on the unfixed code and capturing the AAPT error; then verify the fix works correctly and preserves the splash screen visual appearance.

### Exploratory Bug Condition Checking

**Goal**: Confirm the bug exists on the unfixed code. Surface the exact AAPT error before applying the fix.

**Test Plan**: Trigger an EAS Build for Android production and capture the build logs.

**Test Cases:**
1. **Trigger EAS Build (unfixed)**: Run `eas build --profile production --platform android --non-interactive` and confirm the build fails with the AAPT error for `drawable-mdpi/assets_splashicon.png`
2. **Inspect PNG metadata**: Use `pngcheck` or `exiftool` to inspect `assets/splash-icon.png` and identify any problematic metadata (ICC profile, gAMA, interlacing)
3. **Verify local development works**: Run the app locally and confirm the splash screen displays correctly (confirms the issue is specific to AAPT, not the image itself)

**Expected Counterexamples:**
- EAS Build fails at `:app:mergeReleaseResources` with "AAPT: error: file failed to compile" for `drawable-mdpi/assets_splashicon.png`
- `pngcheck` or `exiftool` reveals metadata chunks or interlacing in `assets/splash-icon.png`

### Fix Checking

**Goal**: Verify that for all EAS Build runs where the bug condition holds (Android production builds), the fixed build successfully compiles all resources and produces an APK.

**Pseudocode:**
```
FOR ALL buildRun WHERE isBugCondition(buildRun) DO
  result := fixedBuild(buildRun)
  ASSERT result.gradleTask ":app:mergeReleaseResources" COMPLETES SUCCESSFULLY
  ASSERT result.aaptErrors IS EMPTY
  ASSERT result.apkArtifact EXISTS
END FOR
```

**Validation Steps:**
1. Apply the fix (re-export or optimize `assets/splash-icon.png`)
2. Trigger an EAS Build: `eas build --profile production --platform android --non-interactive --wait`
3. Monitor the build logs and confirm `:app:mergeReleaseResources` completes without AAPT errors
4. Confirm the build produces an APK artifact
5. Download the APK and install it on an Android device or emulator
6. Launch the app and verify the splash screen displays correctly

### Preservation Checking

**Goal**: Verify that the splash screen visual appearance is unchanged after the fix.

**Pseudocode:**
```
FOR ALL appLaunch AFTER fix IS APPLIED DO
  ASSERT splashScreen.image VISUALLY MATCHES originalSplashScreen.image
  ASSERT splashScreen.backgroundColor == originalSplashScreen.backgroundColor
  ASSERT splashScreen.resizeMode == originalSplashScreen.resizeMode
END FOR
```

**Testing Approach**:

**Test Cases:**
1. **Visual Comparison**: Launch the app on an Android device before and after the fix, take screenshots of the splash screen, and confirm they are visually identical
2. **Configuration Preservation**: Verify `app.json` still contains the same `expo.splash` configuration (image path, resizeMode, backgroundColor)
3. **iOS Build Preservation**: Trigger an EAS Build for iOS and confirm it completes successfully with the splash screen unchanged
4. **Web Build Preservation**: Run `expo export --platform web` and confirm the splash screen displays correctly in the web build
5. **Local Development Preservation**: Run the app locally and confirm the splash screen displays correctly

### Unit Tests

- Verify `assets/splash-icon.png` file size is reasonable (not corrupted, not excessively large)
- Verify `pngcheck assets/splash-icon.png` reports no errors or warnings
- Verify `exiftool assets/splash-icon.png` shows minimal metadata (no ICC profile, no gAMA, no interlacing)
- Verify `app.json` still references `./assets/splash-icon.png` (or updated path if renamed)

### Property-Based Tests

- For any EAS Build for Android production after the fix: the build MUST complete successfully and produce an APK artifact
- For any app launch on Android after the fix: the splash screen MUST display with the same visual appearance as before the fix
- For any EAS Build for iOS or web after the fix: the build MUST complete successfully with no splash screen issues

### Integration Tests

- **Full EAS Build for Android**: Trigger `eas build --profile production --platform android`, wait for completion, download APK, install on device, launch app, verify splash screen displays correctly
- **Full EAS Build for iOS**: Trigger `eas build --profile production --platform ios`, wait for completion, verify splash screen displays correctly
- **Local development**: Run `npx expo start`, launch on Android emulator, verify splash screen displays correctly
