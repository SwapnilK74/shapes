// src/drawing/measurements/measurementCalculator.ts
import * as THREE from 'three';
import { useStore, type UnitSystem } from '../../store';

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

export const MIN_DIMENSION_LENGTH_M = 0.3048;

/**
 * Format distance for display based on unit system
 */
export function formatMeasurementDistance(distance: number, unitSystem?: UnitSystem): string {
  const unit = unitSystem || useStore.getState().unitSystem;
  
    if (unit === 'metric') {
    return `${distance.toFixed(2)} m`;
  } else {
    const totalFeet = distance * 3.28084;
    return `${totalFeet.toFixed(2)} ft`; 
  }
  // if (unit === 'metric') {
  //   // Metric: meters with 2 decimal places
  //   return `${distance.toFixed(2)} m`;
  // } else {
  //   // Imperial: feet and inches
  //   const { feet, inches } = metersToFeetInches(distance);
    
  //   if (feet === 0) {
  //     // Less than 1 foot, show only inches
  //     return `${inches.toFixed(2)}"`;
  //   } else if (inches < 0.01) {
  //     // Whole feet, no inches
  //     return `${feet}'`;
  //   } else {
  //     // Feet and inches
  //     return `${feet}' ${inches.toFixed(2)}"`;
  //   }
  // }
}

/**
 * Get unit label for UI display
 */
export function getUnitLabel(): string {
  const unit = useStore.getState().unitSystem;
  return unit === 'metric' ? 'm' : 'ft';
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


export function clampDimensionOffset ( offset: number, maxOffset: number = 20): number
{
  return Math.max(-maxOffset, Math.min(maxOffset, offset));
}