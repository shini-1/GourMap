// Minimal shim to satisfy legacy imports during migration away from Firebase.
// NOTE: This does not provide real Firebase functionality.

type FakeAuth = {
  // shape placeholder only; real auth operations handled elsewhere
};

type FakeFirestore = {
  // shape placeholder only
};

let authInstance: FakeAuth | null = null;
let firestoreInstance: FakeFirestore | null = null;

export function initializeFirebase(): void {
  // no-op shim; keep for compatibility
  if (!authInstance) authInstance = {};
  if (!firestoreInstance) firestoreInstance = {};
  console.log('⚠️ Firebase shim initialized (no-op)');
}

export function getAuthInstance(): FakeAuth {
  if (!authInstance) {
    initializeFirebase();
  }
  return authInstance as FakeAuth;
}

export function getFirestoreInstance(): FakeFirestore {
  if (!firestoreInstance) {
    initializeFirebase();
  }
  return firestoreInstance as FakeFirestore;
}
