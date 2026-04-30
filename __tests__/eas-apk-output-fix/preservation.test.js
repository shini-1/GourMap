/**
 * Preservation Property Tests — EAS APK Output Fix
 *
 * Property 2: Preservation — Validation Steps and PR Behavior Unchanged
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *
 * These tests observe the UNFIXED `.github/workflows/build.yml` and capture
 * the baseline behavior that MUST be preserved after the fix is applied.
 *
 * All assertions MUST PASS on unfixed code — this establishes the regression
 * baseline. After the fix is applied (Task 3), these same assertions must
 * continue to pass to confirm no regressions were introduced.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load the workflow file
// ---------------------------------------------------------------------------
const workflowPath = path.resolve(__dirname, '../../.github/workflows/build.yml');
const workflowContent = fs.readFileSync(workflowPath, 'utf8');

// ---------------------------------------------------------------------------
// Helper: extract all step blocks from the workflow YAML.
// Returns an array of step block strings in document order.
// ---------------------------------------------------------------------------
function getAllStepBlocks(content) {
  // Split on "- name:" boundaries to isolate individual steps
  const raw = content.split(/(?=\n      - name:)/);
  // Filter to only blocks that contain a "- name:" marker
  return raw.filter((block) => /- name:/.test(block));
}

// ---------------------------------------------------------------------------
// Helper: find the index of the first step block containing a given string.
// Returns -1 if not found.
// ---------------------------------------------------------------------------
function findStepIndex(stepBlocks, identifier) {
  return stepBlocks.findIndex((block) => block.includes(identifier));
}

// ---------------------------------------------------------------------------
// Helper: find a step block by a distinguishing string.
// Returns null if not found.
// ---------------------------------------------------------------------------
function getStepBlock(content, stepIdentifier) {
  const stepBlocks = content.split(/(?=\n      - name:)/);
  return stepBlocks.find((block) => block.includes(stepIdentifier)) || null;
}

// ---------------------------------------------------------------------------
// Pre-compute step blocks once for all tests
// ---------------------------------------------------------------------------
const stepBlocks = getAllStepBlocks(workflowContent);

// ---------------------------------------------------------------------------
// Preservation Assertion 1: npm install --legacy-peer-deps IS the install command
//
// Requirement 3.5: The system SHALL CONTINUE TO use `npm install --legacy-peer-deps`
//
// EXPECTED TO PASS on unfixed code — this command is present.
// Baseline: the install step runs "npm install --legacy-peer-deps".
// ---------------------------------------------------------------------------
describe('Preservation — .github/workflows/build.yml baseline behavior', () => {
  test('Assertion 1: npm install --legacy-peer-deps is the install command', () => {
    // The workflow must contain exactly this install command.
    // After the fix, this must remain unchanged.
    expect(workflowContent).toMatch(/npm install --legacy-peer-deps/);
  });

  // ---------------------------------------------------------------------------
  // Preservation Assertion 2: expo export --platform web appears BEFORE
  // expo prebuild --platform android in step order
  //
  // Requirements 3.2, 3.3: Both validation steps must run in the correct order.
  //
  // EXPECTED TO PASS on unfixed code — export comes before prebuild.
  // Baseline: "Build Web (Test Export)" step precedes "Build Android (Test Prebuild)".
  // ---------------------------------------------------------------------------
  test('Assertion 2: expo export --platform web appears before expo prebuild --platform android', () => {
    const exportIdx = findStepIndex(stepBlocks, 'expo export --platform web');
    const prebuildIdx = findStepIndex(stepBlocks, 'expo prebuild --platform android');

    // Both steps must be present
    expect(exportIdx).toBeGreaterThanOrEqual(0);
    expect(prebuildIdx).toBeGreaterThanOrEqual(0);

    // expo export must come before expo prebuild
    expect(exportIdx).toBeLessThan(prebuildIdx);
  });

  // ---------------------------------------------------------------------------
  // Preservation Assertion 3: expo prebuild --platform android appears BEFORE
  // any EAS build step
  //
  // Requirement 3.3: expo prebuild must run as a pre-build validation step
  // before invoking EAS.
  //
  // EXPECTED TO PASS on unfixed code — no EAS build step exists at all,
  // so prebuild trivially precedes any EAS step.
  // Baseline: prebuild is the last step; no EAS step follows it.
  // ---------------------------------------------------------------------------
  test('Assertion 3: expo prebuild --platform android appears before any EAS build step', () => {
    const prebuildIdx = findStepIndex(stepBlocks, 'expo prebuild --platform android');

    // prebuild must be present
    expect(prebuildIdx).toBeGreaterThanOrEqual(0);

    // Find any EAS build step index (-1 means absent, which satisfies the constraint)
    const easBuildIdx = findStepIndex(stepBlocks, 'eas build');

    // If an EAS build step exists, it must come after prebuild.
    // On unfixed code easBuildIdx === -1, so this branch is not entered —
    // the assertion passes trivially, correctly capturing the baseline.
    if (easBuildIdx !== -1) {
      expect(prebuildIdx).toBeLessThan(easBuildIdx);
    }

    // Regardless, prebuild must be present
    expect(prebuildIdx).toBeGreaterThanOrEqual(0);
  });

  // ---------------------------------------------------------------------------
  // Preservation Assertion 4: actions/checkout@v4 and actions/setup-node@v4
  // steps ARE present and unchanged
  //
  // Requirements 3.1: These foundational steps must remain in the workflow.
  //
  // EXPECTED TO PASS on unfixed code — both steps are present.
  // Baseline: checkout uses actions/checkout@v4; setup-node uses actions/setup-node@v4.
  // ---------------------------------------------------------------------------
  test('Assertion 4a: actions/checkout@v4 step is present', () => {
    expect(workflowContent).toMatch(/actions\/checkout@v4/);
  });

  test('Assertion 4b: actions/setup-node@v4 step is present', () => {
    expect(workflowContent).toMatch(/actions\/setup-node@v4/);
  });

  test('Assertion 4c: setup-node step uses node-version 18', () => {
    const setupNodeBlock = getStepBlock(workflowContent, 'actions/setup-node@v4');
    expect(setupNodeBlock).not.toBeNull();
    expect(setupNodeBlock).toMatch(/node-version:\s*18/);
  });

  // ---------------------------------------------------------------------------
  // Preservation Assertion 5: The EXISTING steps (checkout, setup-node,
  // setup-expo, npm install, expo export, expo prebuild) do NOT have an
  // `if: github.event_name == 'push'` condition.
  //
  // After the fix, the condition appears only on the NEW EAS build, download,
  // and upload steps. All original steps must remain unconditional.
  //
  // EXPECTED TO PASS on both unfixed and fixed code — existing steps are
  // never gated by the push condition.
  // ---------------------------------------------------------------------------
  test("Assertion 5: existing steps (checkout, setup-node, setup-expo, npm install, expo export, expo prebuild) do NOT have 'if: github.event_name == push' condition", () => {
    // Identifiers that uniquely appear in the original (pre-fix) steps
    const existingStepIdentifiers = [
      'actions/checkout@v4',
      'actions/setup-node@v4',
      'expo/expo-github-action@v8',
      'npm install --legacy-peer-deps',
      'expo export --platform web',
      'expo prebuild --platform android',
    ];

    for (const identifier of existingStepIdentifiers) {
      const block = getStepBlock(workflowContent, identifier);
      expect(block).not.toBeNull();
      // The block for this existing step must NOT contain the push condition
      expect(block).not.toMatch(/if:\s*github\.event_name\s*==\s*['"]push['"]/);
    }
  });

  // ---------------------------------------------------------------------------
  // Preservation Assertion 6: Step order is
  // checkout → setup-node → setup-expo → npm install → expo export → expo prebuild
  //
  // Requirements 3.1, 3.2, 3.3: The full step sequence must be preserved.
  //
  // EXPECTED TO PASS on unfixed code — this is the exact current order.
  // Baseline: six steps in this exact sequence.
  // ---------------------------------------------------------------------------
  test('Assertion 6: step order is checkout → setup-node → setup-expo → npm install → expo export → expo prebuild', () => {
    const checkoutIdx   = findStepIndex(stepBlocks, 'actions/checkout@v4');
    const setupNodeIdx  = findStepIndex(stepBlocks, 'actions/setup-node@v4');
    const setupExpoIdx  = findStepIndex(stepBlocks, 'expo/expo-github-action@v8');
    const installIdx    = findStepIndex(stepBlocks, 'npm install --legacy-peer-deps');
    const exportIdx     = findStepIndex(stepBlocks, 'expo export --platform web');
    const prebuildIdx   = findStepIndex(stepBlocks, 'expo prebuild --platform android');

    // All six steps must be present
    expect(checkoutIdx).toBeGreaterThanOrEqual(0);
    expect(setupNodeIdx).toBeGreaterThanOrEqual(0);
    expect(setupExpoIdx).toBeGreaterThanOrEqual(0);
    expect(installIdx).toBeGreaterThanOrEqual(0);
    expect(exportIdx).toBeGreaterThanOrEqual(0);
    expect(prebuildIdx).toBeGreaterThanOrEqual(0);

    // Enforce strict ordering
    expect(checkoutIdx).toBeLessThan(setupNodeIdx);
    expect(setupNodeIdx).toBeLessThan(setupExpoIdx);
    expect(setupExpoIdx).toBeLessThan(installIdx);
    expect(installIdx).toBeLessThan(exportIdx);
    expect(exportIdx).toBeLessThan(prebuildIdx);
  });
});
