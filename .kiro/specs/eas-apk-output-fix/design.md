# EAS APK Output Fix — Bugfix Design

## Overview

The GitHub Actions workflow (`.github/workflows/build.yml`) currently runs only validation steps (`expo export` and `expo prebuild`) and never produces an APK. The fix adds three targeted changes to the workflow:

1. Add `eas-version: latest` to the `expo/expo-github-action@v8` setup step so the EAS CLI is installed.
2. Add `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}` as an environment variable on the EAS build step so authentication succeeds.
3. Add an `eas build --profile production --platform android --non-interactive --wait` step that submits to EAS cloud and waits for the artifact URL, then downloads the APK and uploads it as a GitHub Actions artifact via `actions/upload-artifact`.

The `eas.json` `production` profile already specifies `android.buildType: "apk"`, so no changes to `eas.json` or `app.json` are required. All existing validation steps are preserved.

**Build approach chosen: EAS cloud build with `--wait`**

The `--local` flag would require a full Android SDK setup on the runner (JDK, Android SDK, NDK, Gradle), adding significant complexity and build time. Using EAS cloud with `--wait` leverages the already-registered EAS project (`projectId: 96f8c0be-919e-4c4e-86c0-ddcbf822da3f`) and keeps the runner lean. The `--non-interactive` flag prevents the CLI from prompting for input, and `--wait` blocks the step until the remote build finishes and returns the artifact URL.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the workflow completes without invoking `eas build` and without uploading any APK artifact.
- **Property (P)**: The desired behavior when a commit is pushed to `main` — the workflow SHALL produce a downloadable APK artifact attached to the workflow run.
- **Preservation**: The existing `expo export` and `expo prebuild` validation steps, dependency installation, and PR-trigger behavior that must remain unchanged by the fix.
- **`expo/expo-github-action@v8`**: The GitHub Action that installs the Expo CLI and optionally the EAS CLI. The `eas-version` input controls whether EAS CLI is installed.
- **`EXPO_TOKEN`**: A GitHub Actions secret containing an Expo account token. Required by the EAS CLI to authenticate with the EAS Build service.
- **`eas build --wait`**: EAS CLI flag that submits a cloud build job and blocks the step until the build completes, printing the artifact URL to stdout.
- **`actions/upload-artifact`**: GitHub's official action for attaching files to a workflow run, making them downloadable from the Actions UI.
- **EAS cloud build**: A remote build service hosted by Expo. Builds run on Expo's infrastructure; the GitHub Actions runner only submits the job and waits.
- **`--local` build**: An alternative where `eas build` runs the entire Android build on the GitHub Actions runner itself. Requires Android SDK setup; not chosen for this fix.

---

## Bug Details

### Bug Condition

The bug manifests on every push to `main`. The workflow completes all steps successfully but never calls `eas build`, never downloads an APK, and never uploads an artifact. The root cause is a combination of three missing configurations in `.github/workflows/build.yml`:

- `eas-version` is absent from the `expo/expo-github-action@v8` step, so the EAS CLI is not installed.
- `EXPO_TOKEN` is not passed to any step, so even if the CLI were present, authentication would fail.
- No `eas build` step exists in the workflow at all.

**Formal Specification:**
```
FUNCTION isBugCondition(workflowRun)
  INPUT: workflowRun — a completed GitHub Actions workflow run triggered by push to main
  OUTPUT: boolean

  RETURN workflowRun.trigger == "push"
         AND workflowRun.branch == "main"
         AND workflowRun.artifacts IS EMPTY
         AND workflowRun.steps DO NOT CONTAIN any step invoking "eas build"
END FUNCTION
```

### Examples

- **Push to `main` (current behavior)**: Workflow runs `expo export`, `expo prebuild`, then exits. No artifact is attached. `isBugCondition` returns `true`.
- **Push to `main` (after fix)**: Workflow runs validation steps, then `eas build --profile production --platform android --non-interactive --wait`, downloads the APK, uploads it as an artifact. `isBugCondition` returns `false`.
- **Pull request to `main` (current and after fix)**: Workflow runs only validation steps — no `eas build` is triggered. This is correct behavior; `isBugCondition` does not apply to PR runs.
- **Push to `main` with a failing `expo export` step**: Workflow aborts before reaching `eas build`. No artifact is produced, but this is expected — the pre-build validation correctly blocked a broken build.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `expo export --platform web` MUST continue to run as a pre-build validation step on every push to `main`.
- `expo prebuild --platform android` MUST continue to run as a pre-build validation step on every push to `main`.
- Both validation steps MUST continue to run on pull requests targeting `main`.
- If either validation step fails, the workflow MUST continue to abort without submitting an EAS build job.
- `npm install --legacy-peer-deps` MUST continue to be the dependency installation command.
- The `actions/checkout@v4` and `actions/setup-node@v4` steps MUST remain unchanged.

**Scope:**
All workflow behavior that does NOT involve the new `eas build` and `upload-artifact` steps must be completely unaffected by this fix. This includes:
- PR trigger behavior (validation only, no build)
- Dependency installation
- Web export validation
- Android prebuild validation
- Failure/abort behavior when validation steps fail

---

## Hypothesized Root Cause

Based on the bug description and inspection of `.github/workflows/build.yml`, the causes are confirmed (not merely hypothesized) — the file simply lacks the required steps:

1. **Missing `eas-version` in setup step**: The `expo/expo-github-action@v8` step has `expo-version: latest` and `eas-cache: true` but no `eas-version`. Without this input, the action does not install the EAS CLI binary, making `eas` an unknown command in all subsequent steps.

2. **Missing `EXPO_TOKEN` environment variable**: The EAS CLI requires authentication to submit cloud builds. The `EXPO_TOKEN` secret exists in the repository but is never injected into the environment. Any `eas build` invocation without it would fail with an authentication error.

3. **No `eas build` step**: The workflow was intentionally written as a validation-only pipeline (the comment at the bottom of the file confirms this). The step that actually invokes `eas build` was never added.

4. **No artifact upload step**: Even if `eas build` ran and produced an APK URL, there is no step to download the file and attach it to the workflow run via `actions/upload-artifact`.

---

## Correctness Properties

Property 1: Bug Condition — EAS Build Produces Downloadable APK Artifact

_For any_ workflow run triggered by a push to `main` where all pre-build validation steps pass, the fixed workflow SHALL invoke `eas build --profile production --platform android --non-interactive --wait`, wait for the EAS cloud build to complete, download the resulting APK, and upload it as a named GitHub Actions artifact accessible from the workflow run UI.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Validation Steps and PR Behavior Unchanged

_For any_ workflow run where the bug condition does NOT hold (i.e., the run is triggered by a pull request, or a validation step fails before reaching the EAS build step), the fixed workflow SHALL produce exactly the same behavior as the original workflow — running `expo export --platform web` and `expo prebuild --platform android` with `npm install --legacy-peer-deps`, and aborting on failure — without submitting any EAS build job.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

**File**: `.github/workflows/build.yml`

All changes are additive or minimal modifications to the existing YAML. No steps are removed.

**Specific Changes:**

1. **Add `eas-version: latest` to the Setup Expo step**
   - Current: `expo/expo-github-action@v8` with only `expo-version: latest` and `eas-cache: true`
   - Change: Add `eas-version: latest` so the EAS CLI binary is installed alongside the Expo CLI
   - This unblocks all subsequent `eas` commands

2. **Add EAS Build step after `expo prebuild`**
   - Insert a new step: `🚀 Build Android APK (EAS)`
   - Command: `eas build --profile production --platform android --non-interactive --wait`
   - Environment: `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}`
   - The `--non-interactive` flag prevents CLI prompts; `--wait` blocks until the remote build finishes and prints the artifact download URL
   - Condition: only runs on `push` events (not PRs), using `if: github.event_name == 'push'`

3. **Add step to find and download the APK artifact**
   - After the EAS build step, parse the artifact URL from EAS CLI output and download the APK file
   - Store the APK in a known local path (e.g., `./build/app-production.apk`)

4. **Add `actions/upload-artifact` step**
   - Insert a new step: `📦 Upload APK Artifact`
   - Uses: `actions/upload-artifact@v4`
   - `name`: `android-apk-production`
   - `path`: the downloaded APK file path
   - `if: github.event_name == 'push'` — only runs on push, not PRs
   - This makes the APK downloadable from the GitHub Actions workflow run UI

5. **Remove the now-outdated comment** at the bottom of the file that says EAS builds require secrets and are not run in this workflow.

### Final Workflow Structure (push to `main`)

```
checkout → setup-node → setup-expo (with eas-version) → npm install
  → expo export (web validation)
  → expo prebuild (android validation)
  → eas build --profile production --platform android --non-interactive --wait
  → download APK from EAS artifact URL
  → actions/upload-artifact (attach APK to workflow run)
```

### Final Workflow Structure (pull request to `main`)

```
checkout → setup-node → setup-expo (with eas-version) → npm install
  → expo export (web validation)
  → expo prebuild (android validation)
  [EAS build and upload steps skipped — if: github.event_name == 'push']
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists on the unfixed workflow by inspecting the current workflow definition and its run history; then verify the fix works correctly and preserves existing behavior.

Because this bug is in a CI/CD workflow file rather than application code, traditional unit tests and property-based tests apply to the workflow logic conceptually. The primary validation is done by triggering actual workflow runs and inspecting their outputs.

### Exploratory Bug Condition Checking

**Goal**: Confirm the bug exists on the unfixed code. Surface the exact failure mode before applying the fix.

**Test Plan**: Inspect the current `.github/workflows/build.yml` and any recent workflow run history to confirm that:
- No `eas build` step is present
- No artifact is uploaded
- The EAS CLI is not installed (no `eas-version` in setup step)

**Test Cases:**
1. **Inspect workflow file**: Confirm absence of `eas build` step (will confirm bug on unfixed code)
2. **Inspect setup step**: Confirm `eas-version` is missing from `expo/expo-github-action@v8` (will confirm bug on unfixed code)
3. **Inspect workflow run artifacts**: Confirm no APK artifact is attached to recent `main` push runs (will confirm bug on unfixed code)
4. **Inspect EXPO_TOKEN usage**: Confirm `EXPO_TOKEN` secret is never referenced in the workflow (will confirm bug on unfixed code)

**Expected Counterexamples:**
- Workflow runs on `main` push complete successfully but have zero artifacts attached
- The `expo/expo-github-action@v8` step does not install the EAS CLI binary

### Fix Checking

**Goal**: Verify that for all workflow runs where the bug condition holds (push to `main` with passing validation), the fixed workflow produces a downloadable APK artifact.

**Pseudocode:**
```
FOR ALL workflowRun WHERE isBugCondition(workflowRun) DO
  result := fixedWorkflow(workflowRun)
  ASSERT result.artifacts CONTAINS file matching "*.apk"
  ASSERT result.artifacts["android-apk-production"] IS DOWNLOADABLE
  ASSERT result.steps CONTAINS step invoking "eas build --profile production"
END FOR
```

**Validation Steps:**
1. Push a commit to `main` after applying the fix
2. Observe the workflow run in GitHub Actions UI
3. Confirm the `🚀 Build Android APK (EAS)` step appears and completes
4. Confirm the `📦 Upload APK Artifact` step appears and completes
5. Confirm the artifact `android-apk-production` is listed and downloadable on the workflow run summary page
6. Download the artifact and verify it is a valid APK file

### Preservation Checking

**Goal**: Verify that for all workflow runs where the bug condition does NOT hold (PR runs, or runs where validation fails), the fixed workflow behaves identically to the original.

**Pseudocode:**
```
FOR ALL workflowRun WHERE NOT isBugCondition(workflowRun) DO
  ASSERT fixedWorkflow(workflowRun) BEHAVES SAME AS originalWorkflow(workflowRun)
END FOR
```

**Testing Approach**: Manual inspection and targeted workflow runs are the primary validation method for a CI/CD workflow fix. The key preservation checks are:

**Test Cases:**
1. **PR Validation Preservation**: Open a pull request targeting `main` and confirm the workflow runs only `expo export` and `expo prebuild` — no EAS build step executes. Verify the `if: github.event_name == 'push'` condition correctly gates the new steps.
2. **Validation Failure Preservation**: Introduce a deliberate syntax error in a source file, push to a branch, open a PR, and confirm the workflow aborts at the failing validation step without reaching EAS build.
3. **Dependency Installation Preservation**: Confirm `npm install --legacy-peer-deps` is still the install command and has not been altered.
4. **Step Order Preservation**: Confirm `expo export` still runs before `expo prebuild`, and both still run before the new EAS build step.

### Unit Tests

- Verify `eas-version: latest` is present in the `expo/expo-github-action@v8` step YAML
- Verify `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}` is set on the EAS build step
- Verify `--non-interactive` and `--wait` flags are present in the `eas build` command
- Verify `--profile production` and `--platform android` are present in the `eas build` command
- Verify `actions/upload-artifact@v4` step is present with correct `name` and `path` inputs
- Verify both new steps have `if: github.event_name == 'push'` condition

### Property-Based Tests

- For any valid push-to-main workflow run where all validation steps pass: the workflow MUST produce exactly one artifact named `android-apk-production`
- For any pull-request workflow run: the workflow MUST NOT invoke `eas build` and MUST NOT upload any artifact
- For any workflow run where a validation step exits with a non-zero code: no subsequent steps (including EAS build) MUST execute

### Integration Tests

- **Full push-to-main flow**: Push a real commit to `main`, wait for the complete workflow run, download the artifact, and verify the APK installs on an Android device or emulator
- **PR flow unchanged**: Open a PR, confirm only validation steps run, confirm no artifact is produced, confirm the PR check passes
- **Secret availability**: Confirm `EXPO_TOKEN` secret is configured in the repository settings before triggering the first fixed workflow run
