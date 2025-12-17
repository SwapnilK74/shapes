// src/drawing/shapes/lineShape.ts
import * as THREE from 'three';
import { useStore, hexToNumber } from '../../store';

export function createLineObject(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): THREE.Line {
  const points = [
    new THREE.Vector3(startX, startY, 0.001),
    new THREE.Vector3(endX, endY, 0.001)
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Get default fill color from store (not outline)
  const { defaultFillColor } = useStore.getState();
  
  const material = new THREE.LineBasicMaterial({ 
    color: hexToNumber(defaultFillColor) 
  });

  const line = new THREE.Line(geometry, material);
  line.userData.geometryType = 'line';

  return line;
}
