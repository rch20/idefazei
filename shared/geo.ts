export function isSuspiciousCoordinatePair(latitude: number, longitude: number) {
  return Math.abs(latitude) < 1 && Math.abs(longitude) < 1;
}
