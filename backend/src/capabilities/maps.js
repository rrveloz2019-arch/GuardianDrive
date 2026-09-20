// maps.js - FREE TIER capability
// Real Google Maps Platform integration: Geocoding + Directions.
// Requires GOOGLE_MAPS_API_KEY in .env
// (an API key from Google Cloud Console, restricted to:
//   - Directions API
//   - Geocoding API
// on the SAME Google Cloud project used elsewhere in this app.)
//
// NOTE ON SCOPE (decided 2026-09-20): this capability is Google-only.
// True Apple Maps/MapKit turn-by-turn navigation only runs inside a native
// iOS app (it is not a web API Google-style backend calls can reach), so it
// is out of scope here until the iOS app exists. This module gives the
// backend everything it needs to resolve "where is X" and "how do I get
// from A to B" as spoken results; a future iOS app can still hand the same
// route off to Apple Maps for turn-by-turn if desired.

const GEOCODE_API = 'https://maps.googleapis.com/maps/api/geocode/json';
const DIRECTIONS_API = 'https://maps.googleapis.com/maps/api/directions/json';

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

async function geocodeAddress(address, apiKey) {
  const url = new URL(GEOCODE_API);
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK') {
    const errMessage = data.error_message || data.status || `HTTP ${response.status}`;
    throw new Error(`Google Geocoding API error: ${errMessage}`);
  }

  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  };
}

export const mapsCapability = {
  id: 'maps',
  label: 'Maps & Navigation',
  tier: 'free',
  actions: {
    // "Where is the nearest coffee shop" / "what's the address of X"
    locate: {
      description: 'Resolve a spoken place or address into a formatted address and coordinates.',
      handler: async ({ query }) => {
        if (!query) throw new Error('query is required');

        const apiKey = getApiKey();
        if (!apiKey) {
          return {
            implemented: false,
            query,
            message: 'Maps capability is missing GOOGLE_MAPS_API_KEY in .env - no maps provider connected yet.',
          };
        }

        const place = await geocodeAddress(query, apiKey);

        return {
          implemented: true,
          query,
          message: `${query} is at ${place.formattedAddress}.`,
          result: place,
        };
      },
    },

    // "Give me directions from A to B" / "how long to get to X"
    directions: {
      description: 'Get driving/walking/transit directions and a spoken summary between two places.',
      handler: async ({ origin, destination, mode }) => {
        if (!origin) throw new Error('origin is required');
        if (!destination) throw new Error('destination is required');

        const travelMode = (mode || 'driving').toLowerCase();
        const validModes = ['driving', 'walking', 'bicycling', 'transit'];
        if (!validModes.includes(travelMode)) {
          throw new Error(`mode must be one of: ${validModes.join(', ')}`);
        }

        const apiKey = getApiKey();
        if (!apiKey) {
          return {
            implemented: false,
            origin,
            destination,
            message: 'Maps capability is missing GOOGLE_MAPS_API_KEY in .env - no maps provider connected yet.',
          };
        }

        const url = new URL(DIRECTIONS_API);
        url.searchParams.set('origin', origin);
        url.searchParams.set('destination', destination);
        url.searchParams.set('mode', travelMode);
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status !== 'OK') {
          const errMessage = data.error_message || data.status || `HTTP ${response.status}`;
          throw new Error(`Google Directions API error: ${errMessage}`);
        }

        const route = data.routes[0];
        const leg = route.legs[0];

        const spokenSummary = `${leg.distance.text}, about ${leg.duration.text} by ${travelMode} from ${leg.start_address} to ${leg.end_address}.`;

        return {
          implemented: true,
          origin: leg.start_address,
          destination: leg.end_address,
          mode: travelMode,
          distance: leg.distance.text,
          duration: leg.duration.text,
          message: spokenSummary,
          steps: leg.steps.map((step) => ({
            instruction: step.html_instructions.replace(/<[^>]+>/g, ''), // strip HTML tags for speech
            distance: step.distance.text,
            duration: step.duration.text,
          })),
        };
      },
    },
  },
};
