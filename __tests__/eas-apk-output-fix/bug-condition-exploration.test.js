/**
 * Bug Condition Exploration Test — EAS APK Output Fix
 *
 * Property 1: Bug Condition — EAS Build and APK Artifact Missing on Push to Main
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * This test inspects `.github/workflows/build.yml` and asserts the EXPECTED
 * (fixed) behavior. On UNFIXED code ALL assertions are expected to FAIL —
 * that failure is the counterexample that proves the bug exists.
 *
 * DO NOT fix the code in this task. Just inspect and document.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the workflow file
// ---------------------------------------------------------------------------
const workflowPath = path.resolve(__dirname, '../../.github/workflows/build.yml');
const workflowContent = fs.readFileSync(workflowPath, 'utf8');

// ---------------------------------------------------------------------------
// Helper: find a YAML step block by a distinguishing string
// ---------------------------------------------------------------------------
function getStepBlock(content, stepIdentifier) {
  // Split on "- name:" boundaries to isolate individual steps
  const stepBlocks = content.split(/(?=\n      - name:)/);
  return stepBlocks.find((block) => block.includes(stepIdentifier)) || null;
}

// ---------------------------------------------------------------------------
// Assertion 1: expo/expo-github-action@v8 step MUST contain eas-version: latest
//
// EXPECTED TO FAIL on unfixed code — the key is absent.
// Counterexample: the step has expo-version and eas-cache but no eas-version.
// ---------------------------------------------------------------------------
describe('Bug Condition Exploration — .github/workflows/build.yml', () => {
  const expoActionBlock = getStepBlock(workflowContent, 'expo/expo-github-action@v8');

  test('Assertion 1: expo/expo-github-action@v8 step contains eas-version: latest', () => {
    // This FAILS on unfixed code — eas-version is absent from the step.
    // Counterexample: step has "expo-version: latest" and "eas-cache: true" but no "eas-version".
    expect(expoActionBlock).not.toBeNull();
    expect(expoActionBlock).toMatch(/eas-version:\s*latest/);
  });

  // ---------------------------------------------------------------------------
  // Assertion 2: workflow MUST contain a step invoking eas build --profile production --platform android
  //
  // EXPECTED TO FAIL on unfixed code — no such step exists.
  // Counterexample: the only build steps are "expo export" and "expo prebuild".
  // ---------------------------------------------------------------------------
  test('Assertion 2: workflow contains a step invoking eas build --profile production --platform android', () => {
    // This FAILS on unfixed code — no eas build step exists.
    // Counterexample: workflow only runs "npx expo export" and "npx expo prebuild".
    expect(workflowContent).toMatch(/eas build --profile production --platform android/);
  });

  // ---------------------------------------------------------------------------
  // Assertion 3: workflow MUST contain a step using actions/upload-artifact
  //
  // EXPECTED TO FAIL on unfixed code — no such step exists.
  // Counterexample: no upload-artifact step is present anywhere in the file.
  // ---------------------------------------------------------------------------
  test('Assertion 3: workflow contains a step using actions/upload-artifact', () => {
    // This FAILS on unfixed code — no upload-artifact step exists.
    // Counterexample: the only "uses:" entries are checkout, setup-node, and expo-github-action.
    expect(workflowContent).toMatch(/actions\/upload-artifact/);
  });

  // ---------------------------------------------------------------------------
  // Assertion 4: workflow MUST reference EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
  //
  // EXPECTED TO FAIL on unfixed code — EXPO_TOKEN is never referenced.
  // Counterexample: the string "EXPO_TOKEN" does not appear anywhere in the file.
  // ---------------------------------------------------------------------------
  test('Assertion 4: workflow references EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}', () => {
    // This FAILS on unfixed code — EXPO_TOKEN is never referenced.
    // Counterexample: grep for "EXPO_TOKEN" returns no matches in the workflow file.
    expect(workflowContent).toMatch(/EXPO_TOKEN:\s*\$\{\{\s*secrets\.EXPO_TOKEN\s*\}\}/);
  });

  // ---------------------------------------------------------------------------
  // Assertion 5: workflow MUST NOT contain the outdated comment about EAS requiring secrets
  //
  // EXPECTED TO FAIL on unfixed code — the comment IS present.
  // Counterexample: the comment "For full EAS builds, secrets (EXPO_TOKEN) would be required"
  //                 appears at the bottom of the file.
  // ---------------------------------------------------------------------------
  test('Assertion 5: workflow does NOT contain the outdated EAS-secrets comment', () => {
    // This FAILS on unfixed code — the outdated comment is present.
    // Counterexample: "# Note: For full EAS builds, secrets (EXPO_TOKEN) would be required."
    expect(workflowContent).not.toMatch(
      /For full EAS builds, secrets \(EXPO_TOKEN\) would be required/
    );
  });
});
