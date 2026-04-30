# Bugfix Requirements Document

## Introduction

The GitHub Actions workflow (`.github/workflows/build.yml`) was written as a validation-only pipeline. It runs `expo export` and `expo prebuild` to confirm the project compiles, but it never invokes `eas build` and never uploads any artifact. As a result, pushing a commit to `main` produces no APK — the primary deliverable of the CI/CD pipeline. The `eas.json` `production` profile is already correctly configured with `android.buildType: "apk"` and the EAS project is registered (`projectId: 96f8c0be-919e-4c4e-86c0-ddcbf822da3f`), so the fix is entirely in the workflow file.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a commit is pushed to the `main` branch THEN the system runs only `expo export` and `expo prebuild` validation steps and produces no APK artifact

1.2 WHEN the GitHub Actions workflow completes on a push to `main` THEN the system uploads no artifact to the workflow run, leaving no downloadable APK

1.3 WHEN `expo/expo-github-action@v8` is configured without `eas-version` THEN the system does not install the EAS CLI, making `eas build` unavailable in the workflow

1.4 WHEN the workflow runs THEN the system does not authenticate with EAS using `EXPO_TOKEN`, so any `eas build` invocation would fail with an authentication error

### Expected Behavior (Correct)

2.1 WHEN a commit is pushed to the `main` branch THEN the system SHALL invoke `eas build --profile production --platform android --non-interactive` after the validation steps complete successfully

2.2 WHEN the EAS build completes THEN the system SHALL download the resulting APK and upload it as a GitHub Actions artifact accessible from the workflow run UI

2.3 WHEN `expo/expo-github-action@v8` is configured THEN the system SHALL include `eas-version: latest` so that the EAS CLI is installed and available for subsequent steps

2.4 WHEN the workflow runs an EAS build step THEN the system SHALL authenticate using the `EXPO_TOKEN` GitHub secret passed as an environment variable

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a pull request is opened or updated targeting `main` THEN the system SHALL CONTINUE TO run the `expo export` and `expo prebuild` validation steps

3.2 WHEN a commit is pushed to `main` THEN the system SHALL CONTINUE TO run `expo export --platform web` as a pre-build validation step before invoking EAS

3.3 WHEN a commit is pushed to `main` THEN the system SHALL CONTINUE TO run `expo prebuild --platform android` as a pre-build validation step before invoking EAS

3.4 WHEN a pre-build validation step fails THEN the system SHALL CONTINUE TO abort the workflow without submitting a job to EAS Build

3.5 WHEN the workflow installs dependencies THEN the system SHALL CONTINUE TO use `npm install --legacy-peer-deps`
