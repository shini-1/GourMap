# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - EAS Build and APK Artifact Missing on Push to Main
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in the current `.github/workflows/build.yml`
  - **Scoped PBT Approach**: The bug is deterministic and structural — scope the property to the concrete failing cases by inspecting the workflow YAML directly
  - Inspect `.github/workflows/build.yml` and assert ALL of the following (each assertion should FAIL on unfixed code):
    - The `expo/expo-github-action@v8` step DOES contain `eas-version: latest` → **FAILS** (key is absent)
    - The workflow DOES contain a step invoking `eas build --profile production --platform android` → **FAILS** (no such step)
    - The workflow DOES contain a step using `actions/upload-artifact` → **FAILS** (no such step)
    - The workflow DOES reference `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}` → **FAILS** (never referenced)
    - The workflow DOES NOT contain the outdated comment about EAS requiring secrets → **FAILS** (comment is present)
  - Run inspection on UNFIXED code
  - **EXPECTED OUTCOME**: All assertions FAIL (this is correct — it proves the bug exists)
  - Document counterexamples found:
    - `expo/expo-github-action@v8` step has `expo-version: latest` and `eas-cache: true` but no `eas-version`
    - No step in the workflow invokes `eas build`
    - No step uses `actions/upload-artifact`
    - `EXPO_TOKEN` secret is never referenced anywhere in the file
    - Outdated comment at bottom of file states EAS builds are not run
  - Mark task complete when inspection is done, assertions are written, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Validation Steps and PR Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe the UNFIXED workflow behavior for non-buggy inputs before writing assertions
  - Observe on UNFIXED code (non-bug-condition cases — PR runs and validation-failure runs):
    - `expo export --platform web` step IS present and runs on both push and PR triggers
    - `expo prebuild --platform android` step IS present and runs on both push and PR triggers
    - `npm install --legacy-peer-deps` IS the install command
    - `actions/checkout@v4` and `actions/setup-node@v4` steps ARE present and unchanged
    - No `eas build` step runs on PR triggers (correct — no such step exists at all on unfixed code)
    - No `actions/upload-artifact` step runs on PR triggers (correct — no such step exists at all)
    - Step order: checkout → setup-node → setup-expo → npm install → expo export → expo prebuild
  - Write property-based assertions capturing observed behavior:
    - For any workflow run (push or PR): `npm install --legacy-peer-deps` MUST be the install command
    - For any workflow run (push or PR): `expo export --platform web` MUST appear before `expo prebuild --platform android`
    - For any workflow run (push or PR): `expo prebuild --platform android` MUST appear before any EAS build step
    - For any PR workflow run: no step with `if: github.event_name == 'push'` condition MUST execute
    - For any workflow run where a validation step fails: no subsequent steps MUST execute (standard GitHub Actions behavior — no special handling needed)
  - Verify all assertions PASS on UNFIXED code
  - **EXPECTED OUTCOME**: All assertions PASS (this confirms the baseline behavior to preserve)
  - Mark task complete when assertions are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix `.github/workflows/build.yml` — add EAS build and APK artifact upload

  - [x] 3.1 Add `eas-version: latest` to the `expo/expo-github-action@v8` setup step
    - In the `🏗 Setup Expo` step, add `eas-version: latest` alongside the existing `expo-version: latest` and `eas-cache: true` inputs
    - This installs the EAS CLI binary so that `eas` commands are available in all subsequent steps
    - _Bug_Condition: isBugCondition(workflowRun) where workflowRun.steps DO NOT install EAS CLI (eas-version absent)_
    - _Expected_Behavior: EAS CLI is installed and available for subsequent steps_
    - _Requirements: 2.3_

  - [x] 3.2 Add `eas build` step after `expo prebuild`
    - Insert a new step `🚀 Build Android APK (EAS)` after the `🏗 Build Android (Test Prebuild)` step
    - Command: `eas build --profile production --platform android --non-interactive --wait`
    - Environment variable: `EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}`
    - Condition: `if: github.event_name == 'push'` so this step is skipped on PR runs
    - The `--non-interactive` flag prevents CLI prompts; `--wait` blocks until the remote build finishes and prints the artifact download URL to stdout
    - _Bug_Condition: isBugCondition(workflowRun) where workflowRun.steps DO NOT CONTAIN any step invoking "eas build"_
    - _Expected_Behavior: expectedBehavior — workflow invokes eas build and waits for APK artifact URL_
    - _Preservation: expo export and expo prebuild steps run before this step; this step is gated with if: github.event_name == 'push'_
    - _Requirements: 2.1, 2.4_

  - [x] 3.3 Add step to download the APK from the EAS artifact URL
    - Insert a new step `📥 Download APK from EAS` after the EAS build step
    - Parse the artifact download URL from the EAS CLI output (printed to stdout by `--wait`)
    - Download the APK to a known local path (e.g., `./build/app-production.apk`)
    - Condition: `if: github.event_name == 'push'`
    - _Requirements: 2.2_

  - [x] 3.4 Add `actions/upload-artifact@v4` step to attach the APK to the workflow run
    - Insert a new step `📦 Upload APK Artifact` after the download step
    - Uses: `actions/upload-artifact@v4`
    - `name`: `android-apk-production`
    - `path`: the downloaded APK file path from step 3.3
    - Condition: `if: github.event_name == 'push'` — only runs on push, not PRs
    - This makes the APK downloadable from the GitHub Actions workflow run UI
    - _Bug_Condition: isBugCondition(workflowRun) where workflowRun.artifacts IS EMPTY_
    - _Expected_Behavior: expectedBehavior — artifact named "android-apk-production" is attached and downloadable_
    - _Preservation: this step is gated with if: github.event_name == 'push'; PR runs are unaffected_
    - _Requirements: 2.2_

  - [x] 3.5 Remove the outdated comment at the bottom of the workflow file
    - Delete the comment block: `# Note: For full EAS builds, secrets (EXPO_TOKEN) would be required. / # This workflow validates that the project can be exported and prebuilt.`
    - This comment is now incorrect — the workflow does run EAS builds and does use EXPO_TOKEN
    - _Requirements: 2.1, 2.2_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - EAS Build and APK Artifact Present on Push to Main
    - **IMPORTANT**: Re-run the SAME inspection assertions from task 1 — do NOT write new assertions
    - The assertions from task 1 encode the expected behavior
    - When these assertions pass, it confirms the expected behavior is satisfied
    - Re-run all five assertions from task 1 against the fixed `.github/workflows/build.yml`
    - **EXPECTED OUTCOME**: All assertions PASS (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Validation Steps and PR Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME assertions from task 2 — do NOT write new assertions
    - Run all preservation assertions from task 2 against the fixed `.github/workflows/build.yml`
    - Additionally verify: new EAS build and upload steps have `if: github.event_name == 'push'` condition
    - Additionally verify: step order is checkout → setup-node → setup-expo → npm install → expo export → expo prebuild → eas build → download APK → upload artifact
    - **EXPECTED OUTCOME**: All assertions PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Re-run all assertions from tasks 1 and 2 against the final fixed `.github/workflows/build.yml`
  - Confirm all bug condition assertions now PASS (bug is fixed)
  - Confirm all preservation assertions still PASS (no regressions)
  - Confirm `EXPO_TOKEN` secret is configured in the repository settings before triggering the first live workflow run
  - Optionally: push a commit to `main` and observe the live workflow run in GitHub Actions UI to confirm end-to-end behavior
  - Ensure all tests pass; ask the user if questions arise.
