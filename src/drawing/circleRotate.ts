// src/drawing/circleRotate.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';
import { updateSelectionHelpers } from './selectionHelpers';
import { projectMouseToPlaneForDom } from './sharedPointer';

// --- STATE VARIABLES ---
let isRotating = false;
let initialRotation = 0;
let initialMouseAngle = 0;
let hasInitialAngle = false;
let objectCenter = new THREE.Vector2();

/**
 * Starts the circle rotation operation.
 * Captures the initial rotation and mouse angle.
 */
export function beginCircleRotate(_handleObject: THREE.Object3D) {
  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  initialRotation = mesh.rotation.z;
  objectCenter.set(mesh.position.x, mesh.position.y);
  
  hasInitialAngle = false;
  isRotating = true;
}

export function updateCircleRotate(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!isRotating) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  const mouseWorldPosition = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPosition) return;

  const deltaX = mouseWorldPosition.x - objectCenter.x;
  const deltaY = mouseWorldPosition.y - objectCenter.y;
  const currentMouseAngle = Math.atan2(deltaY, deltaX);

  // Use a boolean flag instead of checking for zero
  if (!hasInitialAngle) {
    initialMouseAngle = currentMouseAngle;
    hasInitialAngle = true;
    return;
  }

  const angleDelta = currentMouseAngle - initialMouseAngle;
  mesh.rotation.z = initialRotation + angleDelta;

  if (event.shiftKey) {
    const snapAngle = Math.PI / 12; // 15 degrees
    mesh.rotation.z = Math.round(mesh.rotation.z / snapAngle) * snapAngle;
  }

  updateSelectionHelpers();
}

export function endCircleRotate() {
  isRotating = false;
  hasInitialAngle = false;
  initialMouseAngle = 0;
}
