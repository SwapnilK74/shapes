// src/drawing/measurements/measurementCalculator.ts
import * as THREE from 'three';

/**
 * Calculate distance between two points
 */
export function calculateDistance(
  point1: THREE.Vector3,
  point2: THREE.Vector3
): number {
  return point1.distanceTo(point2);
}

/**
 * Calculate midpoint between two points
 */
export function calculateMidpoint(
  point1: THREE.Vector3,
  point2: THREE.Vector3
): THREE.Vector3 {
  return new THREE.Vector3()
    .addVectors(point1, point2)
    .multiplyScalar(0.5);
}

/**
 * Calculate perpendicular direction to a line
 */
export function calculatePerpendicularDirection(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3
): THREE.Vector3 {
  const lineDirection = new THREE.Vector3()
    .subVectors(endPoint, startPoint)
    .normalize();
  
  // Perpendicular in 2D (rotate 90 degrees)
  return new THREE.Vector3(-lineDirection.y, lineDirection.x, 0);
}

/**
 * Format distance for display
 */
export function formatMeasurementDistance(distance: number): string {
  return `${distance.toFixed(2)} m`;
}

/**
 * Calculate dimension line position based on mouse position
 * Returns offset distance from the point-to-point line
 */
export function calculateDimensionOffset(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  mousePosition: THREE.Vector3
): number {
  const midpoint = calculateMidpoint(startPoint, endPoint);
  const perpDirection = calculatePerpendicularDirection(startPoint, endPoint);
  
  // Vector from midpoint to mouse
  const toMouse = new THREE.Vector3().subVectors(mousePosition, midpoint);
  
  // Project onto perpendicular direction
  const offset = toMouse.dot(perpDirection);
  
  return offset;
}
