// src/drawing/resizeHandles.ts
import * as THREE from 'three';
import { scene } from '../core/scene';

let resizeHandles: THREE.Mesh[] = [];

/**
 * Creates resize handles for line endpoints
 */
export function createLineResizeHandles(line: THREE.Line): THREE.Mesh[] {
  const handles: THREE.Mesh[] = [];
  const positionAttribute = line.geometry.getAttribute('position');
  if (!positionAttribute) return handles;

  const handleSize = 0.5;
  const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, 0.01);
  const handleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xF5E7C6,
    transparent: true,
    opacity: 0.4
  });

  // Start handle
  const startLocalPosition = new THREE.Vector3(
    positionAttribute.getX(0),
    positionAttribute.getY(0),
    positionAttribute.getZ(0)
  );
  const startWorldPosition = startLocalPosition.clone().applyMatrix4(line.matrixWorld);

  const startHandle = new THREE.Mesh(handleGeometry, handleMaterial);
  startHandle.position.copy(startWorldPosition);
  startHandle.position.z += 0.004;
  startHandle.userData.isResizeHandle = true;
  startHandle.userData.handleRole = 'line-start';

  scene.add(startHandle);
  handles.push(startHandle);

  // End handle
  const endLocalPosition = new THREE.Vector3(
    positionAttribute.getX(1),
    positionAttribute.getY(1),
    positionAttribute.getZ(1)
  );
  const endWorldPosition = endLocalPosition.clone().applyMatrix4(line.matrixWorld);

  const endHandle = new THREE.Mesh(handleGeometry, handleMaterial);
  endHandle.position.copy(endWorldPosition);
  endHandle.position.z += 0.004;
  endHandle.userData.isResizeHandle = true;
  endHandle.userData.handleRole = 'line-end';

  scene.add(endHandle);
  handles.push(endHandle);

  return handles;
}

/**
 * Creates edge resize handles for shapes that follow rotation
 */
export function createShapeResizeHandles(
  selectedObject: THREE.Object3D,
  boundingBox: THREE.Box3
): THREE.Mesh[] {
  const handles: THREE.Mesh[] = [];

  // Get geometry and ensure bounding box is computed
  const mesh = selectedObject as THREE.Mesh;
  const geometry = mesh.geometry;
  if (!geometry) return handles;

  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const localBox = geometry.boundingBox!;

   if (!boundingBox) {
    console.warn('Bounding box is null, cannot create resize handles');
    return handles;
  }

  const min = localBox.min;
  const max = localBox.max;

  // Calculate local edge centers
  const rightCenterLocal = new THREE.Vector3(max.x, (min.y + max.y) / 2, 0);
  const topCenterLocal = new THREE.Vector3((min.x + max.x) / 2, max.y, 0);

  // Transform to world space (applies rotation + position)
  const rightCenterWorld = rightCenterLocal.clone().applyMatrix4(mesh.matrixWorld);
  const topCenterWorld = topCenterLocal.clone().applyMatrix4(mesh.matrixWorld);

  // Calculate edge directions in world space
  // Right edge: from bottom-right to top-right
  const bottomRightLocal = new THREE.Vector3(max.x, min.y, 0);
  const topRightLocal = new THREE.Vector3(max.x, max.y, 0);
  const bottomRightWorld = bottomRightLocal.clone().applyMatrix4(mesh.matrixWorld);
  const topRightWorld = topRightLocal.clone().applyMatrix4(mesh.matrixWorld);
  const rightEdgeDirection = topRightWorld.clone().sub(bottomRightWorld).normalize();

  // Top edge: from top-left to top-right
  const topLeftLocal = new THREE.Vector3(min.x, max.y, 0);
  const topLeftWorld = topLeftLocal.clone().applyMatrix4(mesh.matrixWorld);
  const topEdgeDirection = topRightWorld.clone().sub(topLeftWorld).normalize();

  const handleWidth = 0.6;
  const handleHeight = 0.1;
  const handleDepth = 0.01;

  const edgeHandleGeometry = new THREE.BoxGeometry(
    handleWidth,
    handleHeight,
    handleDepth
  );
  const edgeHandleMaterial = new THREE.MeshBasicMaterial({ color: 0xFAF3E1 });

  // Determine shape type
  const isCircle = geometry instanceof THREE.CircleGeometry;
  const isTriangle = 
    geometry instanceof THREE.BufferGeometry &&
    geometry.getAttribute('position')?.count === 3;

  // Create right handle
  const rightHandle = new THREE.Mesh(edgeHandleGeometry, edgeHandleMaterial);
  rightHandle.position.copy(rightCenterWorld);
  rightHandle.position.z += 0.004;
  
  // Rotate handle to align with edge
  const rightAngle = Math.atan2(rightEdgeDirection.y, rightEdgeDirection.x);
  rightHandle.rotation.z = rightAngle;

  rightHandle.userData.isResizeHandle = true;
  if (isCircle) {
    rightHandle.userData.handleRole = 'ellipse-rx';
  } else if (isTriangle) {
    rightHandle.userData.handleRole = 'triangle-base';
  } else {
    rightHandle.userData.handleRole = 'plane-right';
  }

  scene.add(rightHandle);
  handles.push(rightHandle);

  // Create top handle
  const topHandle = new THREE.Mesh(edgeHandleGeometry, edgeHandleMaterial);
  topHandle.position.copy(topCenterWorld);
  topHandle.position.z += 0.004;
  
  // Rotate handle to align with edge
  const topAngle = Math.atan2(topEdgeDirection.y, topEdgeDirection.x);
  topHandle.rotation.z = topAngle;

  topHandle.userData.isResizeHandle = true;
  if (isCircle) {
    topHandle.userData.handleRole = 'ellipse-ry';
  } else if (isTriangle) {
    topHandle.userData.handleRole = 'triangle-height';
  } else {
    topHandle.userData.handleRole = 'plane-top';
  }

  scene.add(topHandle);
  handles.push(topHandle);

  return handles;
}

export function showResizeHandles(
  selectedObject: THREE.Object3D,
  boundingBox: THREE.Box3
) {
  clearResizeHandles();

  const isLine = selectedObject instanceof THREE.Line;

  if (isLine) {
    resizeHandles = createLineResizeHandles(selectedObject as THREE.Line);
  } else {
    resizeHandles = createShapeResizeHandles(selectedObject, boundingBox);
  }
}

export function clearResizeHandles() {
  for (const handle of resizeHandles) {
    if (handle.parent) handle.parent.remove(handle);
  }
  resizeHandles = [];
}
