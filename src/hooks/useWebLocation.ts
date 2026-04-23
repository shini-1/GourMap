// src/hooks/useWebLocation.ts
import { useState, useEffect, useCallback } from 'react';
import LocationService, { LocationData, LocationError } from '../services/locationService';

export interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: LocationError | null;
  getCurrentLocation: () => Promise<void>;
  isAvailable: boolean;
}

export const useWebLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);

  const locationService = LocationService.getInstance();
  const isAvailable = locationService.isGeolocationAvailable();

  const getCurrentLocation = useCallback(async () => {
    if (!isAvailable) {
      setError({
        code: 2,
        message: 'Geolocation is not available on this device'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await locationService.getCurrentPosition();
      setLocation(position);
    } catch (err) {
      setError(err as LocationError);
    } finally {
      setLoading(false);
    }
  }, [isAvailable, locationService]);

  // Auto-get location on mount (optional)
  useEffect(() => {
    // Uncomment to auto-get location when component mounts
    // getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    isAvailable
  };
};
