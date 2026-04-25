export interface ParsedRestaurant {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Parses a Google Maps or Apple Maps URL to extract restaurant name and coordinates
 * Supports formats like:
 * - https://www.google.com/maps/place/Restaurant+Name/@11.7061,122.3649,17z
 * - https://maps.google.com/?q=11.7061,122.3649
 * - https://maps.apple.com/?address=...&ll=11.7061,122.3649&...
 */
export function parseGoogleMapsUrl(url: string): ParsedRestaurant | null {
  try {
    // Handle place URLs with @ coordinates (Google Maps)
    const placeMatch = url.match(/\/place\/([^\/@]+)\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch) {
      const name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      const latitude = parseFloat(placeMatch[2]);
      const longitude = parseFloat(placeMatch[3]);
      return { name, latitude, longitude };
    }

    // Handle query URLs with ?q=lat,lng (Google Maps)
    const queryMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
      const latitude = parseFloat(queryMatch[1]);
      const longitude = parseFloat(queryMatch[2]);
      // For query URLs, we don't have a name, so use a default
      return { name: `Restaurant at ${latitude}, ${longitude}`, latitude, longitude };
    }

    // Handle Apple Maps URLs with &ll=lat,lng
    const appleMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (appleMatch) {
      const latitude = parseFloat(appleMatch[1]);
      const longitude = parseFloat(appleMatch[2]);

      // Try to extract name from Apple Maps URL
      const addressMatch = url.match(/[?&]q=([^&]+)/);
      let name = 'Unknown Restaurant';
      if (addressMatch) {
        name = decodeURIComponent(addressMatch[1].replace(/\+/g, ' '));
      }

      return { name, latitude, longitude };
    }

    return null;
  } catch (error) {
    console.error('Error parsing Maps URL:', error);
    return null;
  }
}

/**
 * Batch parse multiple Google Maps URLs
 */
export function parseMultipleGoogleMapsUrls(urls: string[]): ParsedRestaurant[] {
  return urls.map(url => parseGoogleMapsUrl(url)).filter((result): result is ParsedRestaurant => result !== null);
}
