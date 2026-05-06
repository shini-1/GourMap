# Bugfix Requirements Document

## Introduction

The EAS Build process for Android is failing during the resource compilation phase with the error:

```
ERROR: /home/expo/workingdir/build/android/app/build/generated/res/createBundleReleaseJsAndAssets/drawable-mdpi/assets_splashicon.png: AAPT: error: file failed to compile.
```

The Android Asset Packaging Tool (AAPT) cannot compile the splash icon PNG file (`assets/splash-icon.png`) that is being processed and placed into the `drawable-mdpi` resource directory. This prevents the APK from being built successfully. The `app.json` configuration references `./assets/splash-icon.png` as the splash screen image, and during the build process, Expo generates density-specific versions of this image (mdpi, hdpi, xhdpi, etc.) for Android. The AAPT compilation failure indicates the generated `assets_splashicon.png` file in the `drawable-mdpi` directory is corrupted, malformed, or incompatible with Android's resource compiler.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the EAS Build process runs `eas build --profile production --platform android` THEN the system fails during the `:app:mergeReleaseResources` Gradle task with an AAPT resource compilation error for `drawable-mdpi/assets_splashicon.png`

1.2 WHEN Expo processes `./assets/splash-icon.png` during the build THEN the system generates a file `assets_splashicon.png` in the `drawable-mdpi` directory that AAPT cannot compile

1.3 WHEN AAPT attempts to compile `drawable-mdpi/assets_splashicon.png` THEN the system reports "file failed to compile" without additional diagnostic details

1.4 WHEN the AAPT compilation fails THEN the system aborts the entire build process, preventing APK generation

### Expected Behavior (Correct)

2.1 WHEN the EAS Build process runs `eas build --profile production --platform android` THEN the system SHALL successfully compile all Android resources including the splash screen image and complete the APK build

2.2 WHEN Expo processes `./assets/splash-icon.png` during the build THEN the system SHALL generate valid, AAPT-compatible PNG files for all density buckets (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

2.3 WHEN AAPT attempts to compile the generated splash icon resources THEN the system SHALL successfully compile all PNG files without errors

2.4 WHEN all resources compile successfully THEN the system SHALL proceed to complete the Gradle build and produce a signed APK artifact

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the app launches on an Android device THEN the system SHALL CONTINUE TO display the splash screen with the configured image and background color

3.2 WHEN `app.json` specifies `splash.image`, `splash.resizeMode`, and `splash.backgroundColor` THEN the system SHALL CONTINUE TO respect these configuration values

3.3 WHEN the build process generates other Android resources (app icon, adaptive icon, etc.) THEN the system SHALL CONTINUE TO compile these resources successfully

3.4 WHEN the app is built for iOS or web platforms THEN the system SHALL CONTINUE TO use the splash icon without any compilation errors

3.5 WHEN the development build runs locally THEN the system SHALL CONTINUE TO display the splash screen correctly
