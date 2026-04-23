// src/services/locationService.ts
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

class LocationService {
  private static instance: LocationService;

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Check if geolocation is available
  public isGeolocationAvailable(): boolean {
    // Check if we're in a web environment or React Native
    const isWeb = typeof window !== 'undefined' && typeof navigator !== 'undefined';

    if (isWeb) {
      // In web browser, check for geolocation API
      return 'geolocation' in navigator;
    } else {
      // In React Native, geolocation is available through Expo
      return true;
    }
  }

  // Get current position using web API
  public async getCurrentPosition(
    options: PositionOptions = {}
  ): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationAvailable()) {
        reject({
          code: 2,
          message: 'Geolocation is not supported by this browser/device'
        } as LocationError);
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let message = 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject({
            code: error.code,
            message
          } as LocationError);
        },
        defaultOptions
      );
    });
  }

  // Watch position changes
  public watchPosition(
    callback: (location: LocationData) => void,
    errorCallback?: (error: LocationError) => void,
    options: PositionOptions = {}
  ): number {
    if (!this.isGeolocationAvailable()) {
      if (errorCallback) {
        errorCallback({
          code: 2,
          message: 'Geolocation is not supported'
        });
      }
      return -1;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
      ...options
    };

    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        if (errorCallback) {
          let message = 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timeout';
              break;
          }
          errorCallback({
            code: error.code,
            message
          });
        }
      },
      defaultOptions
    );
  }

  // Clear watch
  public clearWatch(watchId: number): void {
    if (this.isGeolocationAvailable() && watchId !== -1) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}

export default LocationService;
