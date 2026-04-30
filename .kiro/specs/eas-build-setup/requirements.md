# Requirements Document

## Introduction

GourMap is a React Native / Expo restaurant discovery app targeting Android (and optionally iOS). The project already has a basic `eas.json` with development, preview, and production build profiles, and a GitHub Actions workflow that validates the project via `expo export` and `expo prebuild`. The goal of this feature is to complete the EAS Build Setup so that all three build profiles produce real, distributable artifacts via EAS Build, environment variables and secrets are managed securely per profile, and the CI/CD pipeline triggers EAS builds automatically on the correct branches.

## Glossary

- **EAS**: Expo Application Services — Expo's cloud build and submission platform.
- **EAS_Build**: The EAS Build service that compiles native Android/iOS binaries in the cloud.
- **EAS_CLI**: The `eas` command-line tool used to configure and trigger builds.
- **Build_Profile**: A named configuration block in `eas.json` that defines how a build is produced (e.g., `development`, `preview`, `production`).
- **EXPO_TOKEN**: A personal access token used to authenticate the EAS_CLI in CI environments.
- **GitHub_Actions**: The CI/CD platform used to automate builds on push/PR events.
- **GitHub_Secret**: An encrypted repository-level variable stored in GitHub and injected into GitHub_Actions workflows.
- **EAS_Secret**: An encrypted variable stored in the EAS project and injected into builds at build time.
- **Supabase**: The backend-as-a-service used by GourMap for authentication and database.
- **Mapbox**: The mapping SDK used by GourMap; requires a private Maven download token for Android builds.
- **APK**: Android Package — a distributable Android binary produced by the production build profile.
- **AAB**: Android App Bundle — the preferred format for Google Play Store submission.
- **Internal_Distribution**: EAS distribution mode that shares builds with registered test devices without a store.
- **Development_Client**: A custom Expo Go-like app that includes the project's native modules, used for local development.

---

## Requirements

### Requirement 1: EAS Project Authentication

**User Story:** As a developer, I want the CI/CD pipeline to authenticate with EAS Build using a secure token, so that automated builds can be triggered without manual login.

#### Acceptance Criteria

1. THE EAS_Build SHALL authenticate using an `EXPO_TOKEN` GitHub_Secret injected into the GitHub_Actions environment.
2. WHEN the `EXPO_TOKEN` GitHub_Secret is absent or invalid, THE GitHub_Actions workflow SHALL fail with a descriptive error before attempting any build step.
3. THE EAS_CLI SHALL use the `projectId` value `96f8c0be-919e-4c4e-86c0-ddcbf822da3f` defined in `app.json` to associate builds with the correct EAS project.

---

### Requirement 2: Build Profile Configuration

**User Story:** As a developer, I want three distinct build profiles — development, preview, and production — so that each environment produces the correct artifact type with the appropriate settings.

#### Acceptance Criteria

1. THE `development` Build_Profile SHALL produce a Development_Client binary with `distribution: internal` so that it can be installed on registered test devices.
2. THE `preview` Build_Profile SHALL produce a release-signed APK with `distribution: internal` so that stakeholders can install and test the app without a store.
3. THE `production` Build_Profile SHALL produce an AAB (Android App Bundle) with `distribution: store` so that it is ready for Google Play Store submission.
4. WHEN a build profile does not specify a `channel`, THE EAS_Build SHALL use the profile name as the default update channel.
5. THE `production` Build_Profile SHALL set `NODE_ENV=production` in its `env` block so that production-only code paths are activated.

---

### Requirement 3: Android Signing Configuration

**User Story:** As a developer, I want Android release builds to be signed with a managed keystore, so that APK and AAB artifacts are installable and submittable to the Play Store.

#### Acceptance Criteria

1. THE `preview` Build_Profile SHALL use EAS-managed credentials (`credentialsSource: remote`) so that the keystore is stored securely in EAS and not committed to the repository.
2. THE `production` Build_Profile SHALL use EAS-managed credentials (`credentialsSource: remote`) so that the same keystore is used consistently across all production builds.
3. WHEN EAS-managed credentials do not yet exist for the project, THE EAS_CLI SHALL generate and store a new keystore automatically during the first build.
4. THE `development` Build_Profile SHALL use the local `debug.keystore` (`credentialsSource: local`) so that development builds do not require store credentials.

---

### Requirement 4: Environment Variable and Secret Management

**User Story:** As a developer, I want environment variables and secrets to be injected securely per build profile, so that sensitive values are never committed to the repository and each profile uses the correct configuration.

#### Acceptance Criteria

1. THE EAS_Build SHALL inject `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS_Secrets so that they are available at build time across all profiles.
2. THE EAS_Build SHALL inject `MAPBOX_DOWNLOADS_TOKEN` as an EAS_Secret so that the Mapbox Maven repository can be accessed during the Android Gradle build.
3. THE `production` Build_Profile SHALL set `EXPO_PUBLIC_USE_EDGE_FUNCTIONS=true` in its `env` block so that Edge Functions are enabled only in production.
4. THE `development` Build_Profile SHALL set `EXPO_PUBLIC_USE_EDGE_FUNCTIONS=false` in its `env` block so that local service role key usage is not blocked.
5. IF a required EAS_Secret is missing at build time, THEN THE EAS_Build SHALL fail the build and report which secret is missing.
6. THE repository SHALL NOT contain any secret values in committed files, including `eas.json`, `app.json`, `.env`, or workflow YAML files.

---

### Requirement 5: GitHub Actions CI/CD Integration

**User Story:** As a developer, I want GitHub Actions to automatically trigger EAS builds on the correct branches, so that every merge to main produces a production-ready artifact and pull requests produce preview builds for testing.

#### Acceptance Criteria

1. WHEN a commit is pushed to the `main` branch, THE GitHub_Actions workflow SHALL trigger an EAS_Build using the `production` Build_Profile.
2. WHEN a pull request is opened or updated targeting the `main` branch, THE GitHub_Actions workflow SHALL trigger an EAS_Build using the `preview` Build_Profile.
3. THE GitHub_Actions workflow SHALL install dependencies using `npm install --legacy-peer-deps` before invoking EAS_CLI.
4. THE GitHub_Actions workflow SHALL use `expo/expo-github-action@v8` with `eas-version: latest` to set up both Expo and EAS_CLI.
5. WHEN an EAS_Build is triggered by GitHub_Actions, THE workflow SHALL pass all required GitHub_Secrets as environment variables to the build step.
6. THE GitHub_Actions workflow SHALL upload the resulting APK or AAB artifact to the workflow run so that it can be downloaded from the GitHub Actions UI.
7. WHEN an EAS_Build fails, THE GitHub_Actions workflow SHALL exit with a non-zero status code so that the failure is visible in the pull request status checks.

---

### Requirement 6: Development Build Distribution

**User Story:** As a developer, I want to be able to trigger a development build manually and install it on a registered test device, so that I can test native modules during local development.

#### Acceptance Criteria

1. THE `development` Build_Profile SHALL be triggerable manually via `eas build --profile development --platform android`.
2. WHEN a development build completes, THE EAS_Build SHALL make the binary available for download via the EAS dashboard and the `eas build:list` command.
3. THE Development_Client binary SHALL include all native modules listed in `package.json` (including `@rnmapbox/maps`, `expo-sqlite`, `expo-location`, and `expo-image-picker`) so that they are available during local development sessions.

---

### Requirement 7: Build Validation and Smoke Testing

**User Story:** As a developer, I want the CI/CD pipeline to validate the project before submitting a cloud build, so that obvious configuration errors are caught early without consuming EAS build minutes.

#### Acceptance Criteria

1. WHEN the GitHub_Actions workflow runs, THE workflow SHALL execute `npx expo export --platform web` as a pre-build validation step to confirm the JavaScript bundle compiles without errors.
2. WHEN the pre-build validation step fails, THE GitHub_Actions workflow SHALL abort and SHALL NOT submit a job to EAS_Build.
3. THE GitHub_Actions workflow SHALL run `npx expo prebuild --platform android --clean` to verify native project generation succeeds before submitting to EAS_Build.
4. WHEN `expo prebuild` fails, THE GitHub_Actions workflow SHALL abort and SHALL NOT submit a job to EAS_Build.
