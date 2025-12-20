// src/drawing/rotateHandle.ts
import * as THREE from 'three';
import { scene } from '../core/scene';

let rotateHandle: THREE.Mesh | null = null;

/**
 * Creates a circular rotation handle above the shape's local top edge
 */
export function createRotateHandle(selectedObject: THREE.Object3D): THREE.Mesh {
  const mesh = selectedObject as THREE.Mesh;
  const geometry = mesh.geometry;

  if (!geometry) {
    // Fallback for non-mesh objects
    return createRotateHandleFromAABB(selectedObject);
  }

  // Get local bounding box
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const localBox = geometry.boundingBox!;

  // Calculate the top-center point in LOCAL space
  const topCenterLocal = new THREE.Vector3(
    (localBox.min.x + localBox.max.x) / 2,  // Center X
    localBox.max.y,                          // Top Y
    0
  );

  // Transform to WORLD space (applies rotation + position + scale)
  const topCenterWorld = topCenterLocal.clone().applyMatrix4(mesh.matrixWorld);

  // Calculate "up" direction in the object's local space
  const upDirectionLocal = new THREE.Vector3(0, 1, 0);
  const upDirectionWorld = upDirectionLocal
    .clone()
    .applyMatrix4(mesh.matrixWorld)
    .sub(mesh.position)
    .normalize();

  // Position handle 1.5 units above the top edge in the rotated "up" direction
  const handleOffset = 0.5;
  const rotateHandlePosition = topCenterWorld
    .clone()
    .add(upDirectionWorld.multiplyScalar(handleOffset));

  // Lift slightly forward
  rotateHandlePosition.z += 0.004;

  // Create handle
  const rotateHandleGeometry = new THREE.CircleGeometry(0.1, 16);
  const rotateHandleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xE4004B,
    side: THREE.DoubleSide 
  });

  const handle = new THREE.Mesh(rotateHandleGeometry, rotateHandleMaterial);
  handle.position.copy(rotateHandlePosition);
  handle.userData.isRotateHandle = true;
  handle.userData.isSelectionHelper = true; // Prevent selection
  handle.userData.handleRole = 'rotate-handle';

  return handle;
}

/**
 * Fallback for objects without geometry (uses AABB)
 */
function createRotateHandleFromAABB(selectedObject: THREE.Object3D): THREE.Mesh {
  const boundingBox = new THREE.Box3().setFromObject(selectedObject);
  const min = boundingBox.min;
  const max = boundingBox.max;

  const rotateHandlePosition = new THREE.Vector3(
    (min.x + max.x) / 2,
    max.y + 0.5,
    max.z + 0.004
  );

  const rotateHandleGeometry = new THREE.CircleGeometry(0.1, 16);
  const rotateHandleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xE4004B,
    side: THREE.DoubleSide 
  });

  const handle = new THREE.Mesh(rotateHandleGeometry, rotateHandleMaterial);
  handle.position.copy(rotateHandlePosition);
  handle.userData.isRotateHandle = true;
  handle.userData.isSelectionHelper = true;
  handle.userData.handleRole = 'rotate-handle';

  return handle;
}

export function showRotateHandle(selectedObject: THREE.Object3D) {
  clearRotateHandle();
  rotateHandle = createRotateHandle(selectedObject);
  scene.add(rotateHandle);
}

export function clearRotateHandle() {
  if (rotateHandle && rotateHandle.parent) {
    rotateHandle.parent.remove(rotateHandle);
  }
  rotateHandle = null;
}
