// src/services/geocodingService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Cache key generator
function getCacheKey(lat: number, lng: number): string {
  return `geocode_${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

// Get cached result
async function getCachedGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const cached = await AsyncStorage.getItem(getCacheKey(lat, lng));
    return cached;
  } catch (error) {
    console.warn('Failed to get cached geocode:', error);
    return null;
  }
}

// Set cached result
async function setCachedGeocode(lat: number, lng: number, address: string): Promise<void> {
  try {
    await AsyncStorage.setItem(getCacheKey(lat, lng), address);
  } catch (error) {
    console.warn('Failed to cache geocode:', error);
  }
}
export async function reverseGeocodeWeb(lat: number, lng: number): Promise<string> {
  try {
    // Using BigDataCloud free geocoding API (up to 10,000 requests/day)
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    // Build address from available components - prioritize street, city, province
    const addressParts = [];

    // Try to get street information - prioritize structured data
    if (data.street) {
      addressParts.push(data.street);
    } else if (data.localityInfo?.informative?.[0]?.description) {
      const desc = data.localityInfo.informative[0].description;
      // Skip invalid descriptions like "biggest continent in the world"
      if (!desc.includes('continent') && !desc.includes('world') && desc.length < 50) {
        addressParts.push(desc);
      }
    }

    // Get city
    if (data.localityInfo?.administrative?.[2]?.name) {
      addressParts.push(data.localityInfo.administrative[2].name);
    } else if (data.city) {
      addressParts.push(data.city);
    }

    // Get province/state - clean up region information
    let province = null;
    if (data.localityInfo?.administrative?.[1]?.name) {
      province = data.localityInfo.administrative[1].name;
    } else if (data.principalSubdivision) {
      province = data.principalSubdivision;
    }

    // Clean up province name - remove region information for Philippines
    if (province) {
      // Remove patterns like " (Region VI)", " Region", etc.
      province = province.replace(/\s*\([^)]*\)/g, '').replace(/\s*Region\s*\w*/i, '').trim();
      addressParts.push(province);
    }

    // If no structured address, try to build from raw data
    if (addressParts.length === 0) {
      const fallbackParts = [
        data.street || data.locality,
        data.city || data.locality,
        data.principalSubdivision
      ].filter(Boolean);

      if (fallbackParts.length > 0) {
        return fallbackParts.join(', ');
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    return addressParts.join(', ');

  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    // Fallback to coordinates only
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Alternative geocoding service using OpenStreetMap Nominatim (free, rate limited)
export async function reverseGeocodeOSM(lat: number, lng: number): Promise<string> {
  // Add delay to respect rate limits
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Nominatim has strict rate limiting (1 request/second)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );

    if (!response.ok) {
      throw new Error('OSM geocoding request failed');
    }

    const data = await response.json();

    if (data && data.address) {
      // Extract specific address components from OSM
      const address = data.address;
      const addressParts = [];

      // Priority: house_number + road, then suburb/town, then city, then state
      if (address.house_number && address.road) {
        addressParts.push(`${address.house_number} ${address.road}`);
      } else if (address.road) {
        addressParts.push(address.road);
      }

      // Add city/town/municipality
      if (address.city) {
        addressParts.push(address.city);
      } else if (address.town) {
        addressParts.push(address.town);
      } else if (address.municipality) {
        addressParts.push(address.municipality);
      } else if (address.village) {
        addressParts.push(address.village);
      }

      // Add state/province (clean up region info)
      if (address.state) {
        let state = address.state;
        // Remove region information for Philippines
        state = state.replace(/\s*\([^)]*\)/g, '').replace(/\s*Region\s*\w*/i, '').trim();
        addressParts.push(state);
      }

      if (addressParts.length > 0) {
        return addressParts.join(', ');
      }
    }

    // Fallback to cleaned display_name if structured parsing fails
    if (data && data.display_name) {
      // Try to extract just the local part by splitting on country
      const parts = data.display_name.split(', ');
      if (parts.length >= 3) {
        // Take everything except the last 2 parts (country and continent)
        return parts.slice(0, -2).join(', ');
      }
      return data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  } catch (error) {
    console.warn('OSM geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Alternative geocoding using Mapbox (free tier, reliable)
export async function reverseGeocodeMapbox(lat: number, lng: number): Promise<string> {
  const mapboxToken = 'YOUR_MAPBOX_TOKEN';

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,poi&limit=1`
    );

    if (!response.ok) {
      throw new Error('Mapbox geocoding request failed');
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      // Mapbox returns place_name like "Poblacion, Kalibo, Aklan, Philippines"
      const placeName = feature.place_name;
      if (placeName) {
        // Extract up to 3 parts: street, city, province
        const parts = placeName.split(', ');
        if (parts.length >= 3) {
          return parts.slice(0, 3).join(', ');
        }
        return placeName;
      }
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  } catch (error) {
    console.warn('Mapbox geocoding failed:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Combined geocoding with fallback and caching
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = getCacheKey(lat, lng);

  // Check if online
  const netInfo = await NetInfo.fetch();
  const isOnline = netInfo.isConnected ?? false;

  // Try to get cached result
  const cached = await getCachedGeocode(lat, lng);
  if (cached && (!isOnline || cached !== `${lat.toFixed(4)}, ${lng.toFixed(4)}`)) {
    // Return cached if offline or if cached is not fallback coords
    return cached;
  }

  if (!isOnline) {
    // Offline and no cache, return coords
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  // Online, try to fetch
  try {
    // Try Mapbox first (reliable, good limits)
    const mapboxResult = await reverseGeocodeMapbox(lat, lng);

    // If Mapbox returned just coordinates, try OSM as fallback
    if (mapboxResult === `${lat.toFixed(4)}, ${lng.toFixed(4)}`) {
      const osmResult = await reverseGeocodeOSM(lat, lng);
      if (osmResult !== `${lat.toFixed(4)}, ${lng.toFixed(4)}`) {
        await setCachedGeocode(lat, lng, osmResult);
        return osmResult;
      }
      // Last resort: BigDataCloud
      const webResult = await reverseGeocodeWeb(lat, lng);
      await setCachedGeocode(lat, lng, webResult);
      return webResult;
    }

    await setCachedGeocode(lat, lng, mapboxResult);
    return mapboxResult;
  } catch (error) {
    console.warn('All geocoding services failed, returning cached or coords');
    // If fetch failed, return cached or coords
    return cached || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
