import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { syncService } from './syncService';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

class NetworkService {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = 'unknown';

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Get initial network state
    const initialState = await NetInfo.fetch();
    this.updateStatus(this.mapNetInfoState(initialState));

    // Listen for network changes
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
  }

  private handleNetworkChange(state: NetInfoState): void {
    const newStatus = this.mapNetInfoState(state);
    this.updateStatus(newStatus);
  }

  private mapNetInfoState(state: NetInfoState): NetworkStatus {
    if (state.isConnected === null) return 'unknown';
    if (state.isConnected && state.isInternetReachable !== false) return 'online';
    return 'offline';
  }

  private updateStatus(newStatus: NetworkStatus): void {
    const wasOffline = this.currentStatus === 'offline';
    if (this.currentStatus !== newStatus) {
      this.currentStatus = newStatus;
      console.log('🌐 Network status changed:', newStatus);

      // If we just came back online, trigger sync
      if (wasOffline && newStatus === 'online') {
        console.log('🔄 Triggering automatic sync after coming online');
        syncService.sync({ forceFullSync: false }).catch(error => {
          console.error('❌ Automatic sync failed:', error);
        });
      }

      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(newStatus);
        } catch (error) {
          console.error('Error in network status listener:', error);
        }
      });
    }
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return this.currentStatus === 'online';
  }

  /**
   * Check if device is offline
   */
  isOffline(): boolean {
    return this.currentStatus === 'offline';
  }

  /**
   * Add a listener for network status changes
   */
  addListener(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Wait for network to become online (with timeout)
   */
  async waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isOnline()) return true;

    return new Promise((resolve) => {
      const unsubscribe = this.addListener((status) => {
        if (status === 'online') {
          unsubscribe();
          resolve(true);
        }
      });

      // Set timeout
      setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);
    });
  }

  /**
   * Force refresh network status
   */
  async refresh(): Promise<NetworkStatus> {
    const state = await NetInfo.refresh();
    const newStatus = this.mapNetInfoState(state);
    this.updateStatus(newStatus);
    return newStatus;
  }
}

export const networkService = new NetworkService();

/**
 * React hook for network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(networkService.getStatus());

  useEffect(() => {
    const unsubscribe = networkService.addListener(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

/**
 * React hook for online/offline boolean
 */
export function useIsOnline(): boolean {
  const status = useNetworkStatus();
  return status === 'online';
}
