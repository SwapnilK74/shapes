// src/drawing/dragSelection.ts
import * as THREE from 'three';
import { scene, drawPlane } from '../core/scene';
import { camera } from '../core/camera';
import { getSelectedObject, setSelectedObject } from './selection';
import { updateSelectionHelpers } from './selectionHelpers'; 
import {
  beginPlaneResize,
  updatePlaneResize,
  endPlaneResize
} from './planeResize';
import {
  beginCircleResize,
  updateCircleResize,
  endCircleResize
} from './circleResize';
import {
  beginTriangleResize,
  updateTriangleResize,
  endTriangleResize
} from './triangleResize';
import {
  beginLineResize,
  updateLineResize,
  endLineResize
} from './lineResize';
import {
  beginPlaneRotate,     
  updatePlaneRotate,    
  endPlaneRotate        
} from './planeRotate';
import {
  beginCircleRotate,     
  updateCircleRotate,    
  endCircleRotate        
} from './circleRotate';
import { refreshDimensionsForObject } from './dimensions/dimensionUpdater';
import { projectMouseToPlaneForDom } from './sharedPointer';

import {
  handleMeasureMouseMove
} from './measurements/measureTool';
import { isMeasureMode } from './measurements/measurementManager';

import {
  findLabelAtMousePosition,
  beginLabelDrag,
  updateLabelDrag,
  endLabelDrag,
  isLabelDragging,
  deselectMeasurement
} from './measurements/measurementInteraction';

const raycaster = new THREE.Raycaster();
const normalizedDeviceMouse = new THREE.Vector2();

let isDraggingSelectedObject = false;
const selectedObjectOffset = new THREE.Vector3();

let activeResizeHandle: THREE.Object3D | null = null;
let activeResizeKind: 'plane' | 'circle' | 'triangle' | 'line' | 'rotate-plane' | 'rotate-circle' | null = null; // ← ADD 'rotate'

export function beginSelectionDrag(event: MouseEvent, domElement: HTMLElement) {
  const labelMeasurementId = findLabelAtMousePosition(event, domElement);
  if (labelMeasurementId) {
    beginLabelDrag(labelMeasurementId, event, domElement);
    return;
  }

  deselectMeasurement();

  const bounds = domElement.getBoundingClientRect();

  normalizedDeviceMouse.x =
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  normalizedDeviceMouse.y =
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(normalizedDeviceMouse, camera);

  const intersections = raycaster.intersectObjects(scene.children, false);

  // ← ADD ROTATION HANDLE CHECK FIRST (before resize handles)
  const rotateHandleHit = intersections.find(
    (intersection) => (intersection.object as any).userData?.isRotateHandle
  );

 if (rotateHandleHit) {
  activeResizeHandle = rotateHandleHit.object;
  isDraggingSelectedObject = false;

  // ← NEW: Determine which shape is being rotated
  const mesh = getSelectedObject();
  if (!mesh) return;

  const isCircle = 
    mesh instanceof THREE.Mesh &&
    mesh.geometry instanceof THREE.CircleGeometry;

  // const isTriangle =
  //   mesh instanceof THREE.Mesh &&
  //   mesh.geometry instanceof THREE.BufferGeometry &&
  //   mesh.geometry.getAttribute('position')?.count === 3;

  if (isCircle) {
    activeResizeKind = 'rotate-circle';
    beginCircleRotate(activeResizeHandle);
  // } else if (isTriangle) {
  //   activeResizeKind = 'rotate-triangle';
  //   beginTriangleRotate(activeResizeHandle);
  } else {
    activeResizeKind = 'rotate-plane';
    beginPlaneRotate(activeResizeHandle);
  }

  return;
}

  // Check for resize handles
  const handleHit = intersections.find(
    (intersection) => (intersection.object as any).userData?.isResizeHandle
  );

  if (handleHit) {
    activeResizeHandle = handleHit.object;
    isDraggingSelectedObject = false;

    const handleRole = (activeResizeHandle as any).userData.handleRole as string;

    if (handleRole.startsWith('plane-')) {
      activeResizeKind = 'plane';
      beginPlaneResize(activeResizeHandle);
    } else if (handleRole.startsWith('ellipse-')) {
      activeResizeKind = 'circle';
      beginCircleResize(activeResizeHandle);
    } else if (handleRole.startsWith('triangle-')) {
      activeResizeKind = 'triangle';
      beginTriangleResize(activeResizeHandle);
    } else if (handleRole.startsWith('line-')) {
      activeResizeKind = 'line';
      beginLineResize(activeResizeHandle);
    } else {
      activeResizeKind = null;
    }

    return;
  }

  // Check for shape selection
  const hit = intersections.find(
    (intersection) =>
      intersection.object !== drawPlane &&
      intersection.object.name !== 'gridHelper' &&
      intersection.object.name !== 'selectionOutline' &&
      !(intersection.object as any).isUiOnly &&
      !(intersection.object as any).userData?.isResizeHandle &&
      !(intersection.object as any).userData?.isRotateHandle && // ← ADD THIS
      !(intersection.object as any).isMeasurementHitZone
  );

  if (!hit) {
    setSelectedObject(null);
    isDraggingSelectedObject = false;
    activeResizeHandle = null;
    activeResizeKind = null;
    return;
  }

  const selectedObject = hit.object;
  setSelectedObject(selectedObject);

  const worldHitPoint = hit.point.clone();
  selectedObjectOffset.copy(selectedObject.position).sub(worldHitPoint);
  isDraggingSelectedObject = true;
  activeResizeHandle = null;
  activeResizeKind = null;

  if (
    selectedObject instanceof THREE.Mesh &&
    !Array.isArray(selectedObject.material)
  ) {
    selectedObject.material = selectedObject.material.clone();
    const material = selectedObject.material as THREE.MeshBasicMaterial;
    material.needsUpdate = true;
  }
}

export function updateSelectionDrag(event: MouseEvent, domElement: HTMLElement) {
  if (isLabelDragging()) {
    updateLabelDrag(event, domElement);
    return;
  }

  if (isMeasureMode()) {
    handleMeasureMouseMove(event, domElement);
    return;
  }

  // Handle resize/rotate operations
  if (activeResizeHandle) {
    if (activeResizeKind === 'plane') {
      updatePlaneResize(event, domElement);
    } else if (activeResizeKind === 'circle') {
      updateCircleResize(event, domElement);
    } else if (activeResizeKind === 'triangle') {
      updateTriangleResize(event, domElement);
    } else if (activeResizeKind === 'line') {
      updateLineResize(event, domElement);
  } else if (activeResizeKind === 'rotate-plane') {     
    updatePlaneRotate(event, domElement);
  } else if (activeResizeKind === 'rotate-circle') {    
    updateCircleRotate(event, domElement);
  // } else if (activeResizeKind === 'rotate-triangle') {  
  //   updateTriangleRotate(event, domElement);
  }
    return;
  }

  // Handle object dragging
  if (!isDraggingSelectedObject) return;

  const pointOnPlane = projectMouseToPlaneForDom(event, domElement);
  if (!pointOnPlane) return;

  pointOnPlane.add(selectedObjectOffset);

  const selectedObject = getSelectedObject();
  if (!selectedObject) return;

  selectedObject.position.set(
    pointOnPlane.x,
    pointOnPlane.y,
    selectedObject.position.z
  );

  updateSelectionHelpers(); // ← FIXED FUNCTION NAME

  refreshDimensionsForObject(selectedObject);
}

export function endSelectionDrag() {
  endLabelDrag();

  isDraggingSelectedObject = false;

  if (activeResizeKind === 'plane') endPlaneResize();
  if (activeResizeKind === 'circle') endCircleResize();
  if (activeResizeKind === 'triangle') endTriangleResize();
  if (activeResizeKind === 'line') endLineResize();
if (activeResizeKind === 'rotate-plane') endPlaneRotate();         
if (activeResizeKind === 'rotate-circle') endCircleRotate();       
// if (activeResizeKind === 'rotate-triangle') endTriangleRotate(); 

  activeResizeHandle = null;
  activeResizeKind = null;
}
