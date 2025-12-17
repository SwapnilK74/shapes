// src/drawing/dimensions/lineDimensions.ts
import * as THREE from 'three';
import { createDimensionLabel } from './dimensionRenderer';
import { calculateDistance, formatDistance } from './dimensionCalculator';
import { getCurrentUnitSystem } from './dimensionManager';


export function createLineDimensions(lineMesh: THREE.Line | THREE.LineSegments) {
 
  const positionAttribute = lineMesh.geometry.getAttribute('position');
  
  if (!positionAttribute || positionAttribute.count < 2) {
    console.warn('Line must have at least 2 vertices');
    return;
  }

 
  const startLocal = new THREE.Vector3(
    positionAttribute.getX(0),
    positionAttribute.getY(0),
    positionAttribute.getZ(0)
  );
  
  const endLocal = new THREE.Vector3(
    positionAttribute.getX(1),
    positionAttribute.getY(1),
    positionAttribute.getZ(1)
  );

  const startWorld = startLocal.clone().applyMatrix4(lineMesh.matrixWorld);
  const endWorld = endLocal.clone().applyMatrix4(lineMesh.matrixWorld);

  
  const length = calculateDistance(startWorld, endWorld);
  
  const currentUnit = getCurrentUnitSystem();
  const lengthText = formatDistance(length, currentUnit);

  
  const midpoint = new THREE.Vector3()
    .addVectors(startWorld, endWorld)
    .multiplyScalar(0.5);

  
  createDimensionLabel(`Length: ${lengthText}`, midpoint);
}
