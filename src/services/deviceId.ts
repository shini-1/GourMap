import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fv_device_id';

function generateId(): string {
  // Simple pseudo-UUID; sufficient as a stable anonymous identifier when persisted
  // Example: dev_5f2a7c1b-9e3d-4a8f-b3c2-91a7bcd9e123
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `dev_${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

export async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing && typeof existing === 'string') {
      return existing;
    }
    const id = generateId();
    await AsyncStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Fallback if storage fails
    return generateId();
  }
}
