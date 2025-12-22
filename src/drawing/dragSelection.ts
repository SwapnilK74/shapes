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

import { updateMeasurementsForShape } from './measurements/trackMeasurement';

import {
  findLabelAtMousePosition,
  beginLabelDrag,
  updateLabelDrag,
  endLabelDrag,
  isLabelDragging,
  deselectMeasurement
} from './measurements/measurementInteraction';


import { 
  findAlignmentCandidates, 
  getBestAlignments 
} from './alignment/alignmentDetection';
import { 
  updateAlignmentGuides, 
  clearAlignmentGuides 
} from './alignment/alignmentGuides';
import { 
  applyAlignmentSnap 
} from './alignment/alignmentSnapping';

import { getShapeMeta, setShapeMeta } from './shapeMetadata';

const raycaster = new THREE.Raycaster();
const normalizedDeviceMouse = new THREE.Vector2();

let isDraggingSelectedObject = false;
const selectedObjectOffset = new THREE.Vector3();

let activeResizeHandle: THREE.Object3D | null = null;
let activeResizeKind: 'plane' | 'circle' | 'triangle' | 'line' | 'rotate-plane' | 'rotate-circle' | null = null;

// ✅ NEW: Alignment settings
let alignmentEnabled = true; // Toggle this to enable/disable alignment
const alignmentSnapThreshold = 0.5; // Distance threshold for snapping

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

  // Check rotation handle first
  const rotateHandleHit = intersections.find(
    (intersection) => (intersection.object as any).userData?.isRotateHandle
  );

  if (rotateHandleHit) {
    activeResizeHandle = rotateHandleHit.object;
    isDraggingSelectedObject = false;

    const mesh = getSelectedObject();
    if (!mesh) return;

    const isCircle = 
      mesh instanceof THREE.Mesh &&
      mesh.geometry instanceof THREE.CircleGeometry;

    if (isCircle) {
      activeResizeKind = 'rotate-circle';
      beginCircleRotate(activeResizeHandle);
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
      !(intersection.object as any).userData?.isRotateHandle &&
      !(intersection.object as any).isMeasurementHitZone &&
      !(intersection.object as any).isAlignmentGuide // ✅ NEW: Ignore guide lines
  );

  if (!hit) {
    setSelectedObject(null);
    isDraggingSelectedObject = false;
    activeResizeHandle = null;
    activeResizeKind = null;
    // ✅ NEW: Clear guides when deselecting
    clearAlignmentGuides(scene);
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

function syncPlaneMetaCenter(mesh: THREE.Mesh) {
  const meta = getShapeMeta(mesh);
  if (meta && meta.kind === 'plane') {
    meta.center.set(mesh.position.x, mesh.position.y);
    setShapeMeta(mesh, meta);
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
    }
    return;
  }

  // Handle object dragging
  if (!isDraggingSelectedObject) return;

  const pointOnPlane = projectMouseToPlaneForDom(event, domElement);
  if (!pointOnPlane) return;

  pointOnPlane.add(selectedObjectOffset);

  const selectedObject = getSelectedObject();
  if (!selectedObject || !(selectedObject instanceof THREE.Mesh)) return;

  // ✅ NEW: Apply alignment snapping if enabled
  let finalPosition = pointOnPlane.clone();

  if (alignmentEnabled) {
    // Get all other meshes in scene
    const allShapes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && 
          object.uuid !== selectedObject.uuid &&
          (object.userData.geometryType === 'plane' ||
           object.userData.geometryType === 'circle' ||
           object.userData.geometryType === 'triangle')) {
        allShapes.push(object);
      }
    });

    // Temporarily set position to check alignments
    const originalPosition = selectedObject.position.clone();
    selectedObject.position.copy(finalPosition);

    // Find alignment candidates
    const candidates = findAlignmentCandidates(
      selectedObject,
      allShapes,
      alignmentSnapThreshold
    );

    // Get best alignments (one horizontal, one vertical max)
    const { horizontal, vertical } = getBestAlignments(candidates);

    // Apply snapping
    if (horizontal || vertical) {
      finalPosition = applyAlignmentSnap(
        selectedObject,
        finalPosition,
        horizontal,
        vertical
      );
    }

    // Update guide lines
    updateAlignmentGuides(scene, selectedObject, horizontal, vertical);

    // Restore original position before final update
    selectedObject.position.copy(originalPosition);
  } else {
    // Clear guides if alignment is disabled
    clearAlignmentGuides(scene);
  }

  // Apply final position
  selectedObject.position.set(
    finalPosition.x,
    finalPosition.y,
    selectedObject.position.z
  );

  if (selectedObject.userData.geometryType === 'plane') {
  syncPlaneMetaCenter(selectedObject);
}

  // Update measurements
  updateMeasurementsForShape(selectedObject.uuid);

  updateSelectionHelpers();

    refreshDimensionsForObject(selectedObject);
}

export function endSelectionDrag() {
  endLabelDrag();

  isDraggingSelectedObject = false;

  const selectedObject = getSelectedObject();

  if (activeResizeKind === 'plane') endPlaneResize();
  if (activeResizeKind === 'circle') endCircleResize();
  if (activeResizeKind === 'triangle') endTriangleResize();
  if (activeResizeKind === 'line') endLineResize();
  if (activeResizeKind === 'rotate-plane') endPlaneRotate();
  if (activeResizeKind === 'rotate-circle') endCircleRotate();

  if (selectedObject instanceof THREE.Mesh && activeResizeKind) {
    updateMeasurementsForShape(selectedObject.uuid);
  }

  // ✅ NEW: Clear alignment guides when drag ends
  clearAlignmentGuides(scene);

  activeResizeHandle = null;
  activeResizeKind = null;
}

// ✅ NEW: Export functions to control alignment
export function setAlignmentEnabled(enabled: boolean) {
  alignmentEnabled = enabled;
  if (!enabled) {
    clearAlignmentGuides(scene);
  }
}

export function isAlignmentEnabled(): boolean {
  return alignmentEnabled;
}
