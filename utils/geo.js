// simple geographic utility functions

/**
 * Calculate the great-circle distance between two points using the
 * Haversine formula. Returns distance in meters.
 *
 * @param {number} lat1 latitude of point 1 in decimal degrees
 * @param {number} lon1 longitude of point 1 in decimal degrees
 * @param {number} lat2 latitude of point 2 in decimal degrees
 * @param {number} lon2 longitude of point 2 in decimal degrees
 * @returns {number} distance in meters
 */
exports.calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371000; // earth radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
