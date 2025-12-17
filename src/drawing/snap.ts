import * as THREE from 'three';

export const GRID_STEP = 1; 

export function snapVectorToGrid(v: THREE.Vector3): THREE.Vector3 {
  const step = GRID_STEP;
  v.x = Math.round(v.x / step) * step;
  v.y = Math.round(v.y / step) * step;
  // z stays as-is (0.001) since we’re in XY
  return v;
}
