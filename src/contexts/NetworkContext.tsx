import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkContextType {
  isOnline: boolean;
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isConnected: true,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('🌐 NetInfo state changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isConnectedViaWifi: state.isConnected && state.type === 'wifi',
        isConnectedViaCellular: state.isConnected && state.type === 'cellular'
      });

      // In Expo Go, NetInfo can be unreliable, so we use a more lenient check
      const onlineStatus = state.isConnected ?? true; // Default to true if undefined
      setIsOnline(onlineStatus);
      setIsConnected(onlineStatus);
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      console.log('🌐 Initial NetInfo state:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      });

      // For Expo Go, default to online if we can't determine connectivity
      const onlineStatus = state.isConnected ?? true;
      setIsOnline(onlineStatus);
      setIsConnected(onlineStatus);
    }).catch(error => {
      console.warn('🌐 NetInfo fetch failed, defaulting to online:', error);
      // If NetInfo fails completely, assume we're online
      setIsOnline(true);
      setIsConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  console.log('🌐 NetworkProvider state:', { isOnline, isConnected });

  return (
    <NetworkContext.Provider value={{ isOnline, isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
