/**
 * Location Detection & Handling Utilities for CivicTrust
 */

// Get QR context from localStorage (if recent and valid)
export function getQRContext() {
  try {
    const stored = localStorage.getItem('civictrust_qr_context');
    if (!stored) return null;

    const context = JSON.parse(stored);
    const now = Date.now();
    const contextAge = now - context.timestamp;
    const fifteenMinutes = 15 * 60 * 1000;

    // Reject if older than 15 minutes
    if (contextAge > fifteenMinutes) {
      localStorage.removeItem('civictrust_qr_context');
      return null;
    }

    return {
      zoneName: context.zoneName,
      ward: context.ward,
      zone: context.zone,
      address: context.address,
      lat: context.lat,
      lng: context.lng,
      source: 'QR',
      timestamp: context.timestamp,
    };
  } catch (e) {
    console.error('Error reading QR context:', e);
    return null;
  }
}

// Store QR context when user scans
export function setQRContext(zone) {
  const context = {
    zoneName: zone.zoneName,
    ward: zone.ward,
    zone: zone.zone,
    address: zone.address,
    lat: zone.lat || null,
    lng: zone.lng || null,
    timestamp: Date.now(),
  };
  localStorage.setItem('civictrust_qr_context', JSON.stringify(context));
}

// Clear QR context
export function clearQRContext() {
  localStorage.removeItem('civictrust_qr_context');
}

// Detect GPS location with high accuracy
export function detectGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          lat: parseFloat(latitude.toFixed(6)),
          lng: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          source: 'GPS',
          timestamp: Date.now(),
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

// Reverse geocode coordinates using OpenStreetMap Nominatim
export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    
    if (!response.ok) throw new Error('Reverse geocoding failed');
    
    const data = await response.json();
    
    // Extract address components
    const address = data.display_name || '';
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || '';
    const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || '';
    const state = data.address?.state || '';
    const pincode = data.address?.postcode || '';

    return {
      address,
      city,
      area,
      state,
      pincode,
      fullData: data.address || {},
    };
  } catch (e) {
    console.error('Reverse geocoding error:', e);
    return null;
  }
}

// Format accuracy message
export function formatAccuracy(meters) {
  if (meters < 10) return `Location detected with ~${meters}m accuracy (very precise)`;
  if (meters < 50) return `Location detected with ~${meters}m accuracy (precise)`;
  if (meters < 100) return `Location detected with ~${meters}m accuracy (good)`;
  if (meters < 500) return `Location detected with ~${meters}m accuracy (moderate)`;
  if (meters < 1000) return `Location detected with ~${meters}m accuracy (approximate)`;
  return `Location detected with ~${meters}m accuracy (low accuracy - please verify)`;
}

// Format location display
export function formatLocationDisplay(location) {
  if (!location) return '';
  if (typeof location === 'string') return location;
  if (location.address) return location.address;
  if (location.lat && location.lng) {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
  return '';
}
