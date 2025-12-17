// src/drawing/dimensions/dimensionCalculator.ts
import * as THREE from 'three';
import type { UnitSystem } from './dimensionManager';

// --- DISTANCE CALCULATION ---

/**
 * Calculates the Euclidean distance between two 3D points.
 */
export function calculateDistance(
  pointA: THREE.Vector3,
  pointB: THREE.Vector3
): number {
  return pointA.distanceTo(pointB);
}

// --- ANGLE CALCULATION ---

/**
 * Calculates the angle (in degrees) at vertex B formed by points A-B-C.
 * Uses the law of cosines.
 */
// export function calculateAngle(
//   pointA: THREE.Vector3,
//   pointB: THREE.Vector3,
//   pointC: THREE.Vector3
// ): number {
//   const vectorBA = new THREE.Vector3().subVectors(pointA, pointB);
//   const vectorBC = new THREE.Vector3().subVectors(pointC, pointB);

//   const dotProduct = vectorBA.dot(vectorBC);
//   const magnitudeBA = vectorBA.length();
//   const magnitudeBC = vectorBC.length();

//   // Avoid division by zero
//   if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

//   const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  
//   // Clamp to [-1, 1] to avoid NaN from floating point errors
//   const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  
//   const angleRadians = Math.acos(clampedCos);
//   const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

//   return angleDegrees;
// }

// --- UNIT CONVERSION ---

/**
 * Converts a distance value to the target unit system and returns a formatted string.
 * 
 * @param distanceInWorldUnits - The raw distance from Three.js (assume 1 unit = 1 meter)
 * @param unitSystem - 'metric' or 'imperial'
 */
export function formatDistance(
  distanceInWorldUnits: number,
  unitSystem: UnitSystem
): string {
  if (unitSystem === 'metric') {
   
    return `${distanceInWorldUnits.toFixed(2)}m`;
  } else {
    
    const totalInches = distanceInWorldUnits * 39.3701; 
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);

    if (feet === 0) {
      return `${inches}in`;
    } else if (inches === 0) {
      return `${feet}ft`;
    } else {
      return `${feet}ft ${inches}in`;
    }
  }
}


export function formatAngle(angleDegrees: number): string {
  return `${angleDegrees.toFixed(1)}°`;
}


export function formatRadius(
  radiusInWorldUnits: number,
  unitSystem: UnitSystem
): string {
  const formattedDistance = formatDistance(radiusInWorldUnits, unitSystem);
  return `R = ${formattedDistance}`;
}
