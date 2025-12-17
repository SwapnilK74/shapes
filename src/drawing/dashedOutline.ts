// src/drawing/dashedOutline.ts
import * as THREE from 'three';
import { scene } from '../core/scene';

let selectionOutline: THREE.LineLoop | null = null;

/**
 * Creates the orange dashed outline following object rotation
 */
export function createDashedOutline(selectedObject: THREE.Object3D): THREE.LineLoop {
  // Get local bounding box (respects geometry, not transforms)
  const geometry = (selectedObject as THREE.Mesh).geometry;
  if (!geometry) {
    // Fallback for non-mesh objects
    const box = new THREE.Box3().setFromObject(selectedObject);
    return createAABBOutline(box);
  }

  // Compute local bounding box
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const localBox = geometry.boundingBox!;

  const min = localBox.min;
  const max = localBox.max;
  const z = 0.003;

  // Create corners in LOCAL space
  const localCorners = [
    new THREE.Vector3(min.x, min.y, z),  // Bottom-left
    new THREE.Vector3(max.x, min.y, z),  // Bottom-right
    new THREE.Vector3(max.x, max.y, z),  // Top-right
    new THREE.Vector3(min.x, max.y, z),  // Top-left
  ];

  // Transform corners to WORLD space (applies position, rotation, scale)
  const worldCorners = localCorners.map(corner => 
    corner.clone().applyMatrix4(selectedObject.matrixWorld)
  );

  // Lift corners slightly above the object
  worldCorners.forEach(corner => corner.z += 0.003);

  // Close the loop
  worldCorners.push(worldCorners[0].clone());

  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(worldCorners);

  const outlineMaterial = new THREE.LineDashedMaterial({
    color: 0xFF6D1F,
    dashSize: 0.3,
    gapSize: 0.15,
    linewidth: 2
  });

  const outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
  outline.name = 'selectionOutline';
  outline.renderOrder = 100;
  (outline as any).computeLineDistances?.();

  return outline;
}

/**
 * Fallback for axis-aligned bounding box (used for Lines)
 */
function createAABBOutline(boundingBox: THREE.Box3): THREE.LineLoop {
  const min = boundingBox.min;
  const max = boundingBox.max;

  const bottomLeft = new THREE.Vector3(min.x, min.y, max.z + 0.003);
  const bottomRight = new THREE.Vector3(max.x, min.y, max.z + 0.003);
  const topRight = new THREE.Vector3(max.x, max.y, max.z + 0.003);
  const topLeft = new THREE.Vector3(min.x, max.y, max.z + 0.003);

  const points = [bottomLeft, bottomRight, topRight, topLeft, bottomLeft];
  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  const outlineMaterial = new THREE.LineDashedMaterial({
    color: 0xFF6D1F,
    dashSize: 0.3,
    gapSize: 0.15,
    linewidth: 2
  });

  const outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
  outline.name = 'selectionOutline';
  outline.renderOrder = 100;
  (outline as any).computeLineDistances?.();

  return outline;
}

export function showDashedOutline(selectedObject: THREE.Object3D) {
  clearDashedOutline();
  selectionOutline = createDashedOutline(selectedObject);
  scene.add(selectionOutline);
}

export function clearDashedOutline() {
  if (selectionOutline && selectionOutline.parent) {
    selectionOutline.parent.remove(selectionOutline);
  }
  selectionOutline = null;
}
