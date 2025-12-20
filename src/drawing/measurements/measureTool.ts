// src/drawing/measurements/measureTool.ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { scene, getDrawingBounds } from '../../core/scene';
import { canvas } from '../../core/renderer';
import { collectAllSnapPoints, findNearestSnapPoint, type SnapPoint } from './snapDetection';
import { updateSnapIndicator, disposeSnapIndicator } from './snapIndicator';
import { 
  isMeasureMode,
  addMeasurement,
  setMeasureMode 
} from './measurementManager';
import { projectMouseToPlaneForDom } from '../sharedPointer';
import { renderMeasurement } from './measurementRenderer';
import { calculateDimensionOffset, clampDimensionOffset, MIN_DIMENSION_LENGTH_M } from './measurementCalculator';
import { getMeasurementSettings } from './measurementSettings';
import { 
  collectAllSnapEdges, 
  findNearestEdgeSnap, 
  type SnapEdge,
  createPlaneGuideLineVisuals 
} from './snapEdges';
import { updateEdgeIndicator, disposeEdgeIndicator } from './edgeIndicator';
import { attachMeasurementToShapes } from './trackMeasurement';


// Snap mode flags
let snapToPoints = true;
let snapToEdges = false;
let allowFreeMeasurement = true;
let showGuideLines = true;

// Measurement state
let firstPoint: THREE.Vector3 | null = null;
let secondPoint: THREE.Vector3 | null = null;
let currentSnapPoint: THREE.Vector3 | null = null;
let previewDimensionOffset: number = 1.0;

let firstPointShapeUuid: string | undefined;
let secondPointShapeUuid: string | undefined;

// ✅ NEW: Store second click position for "click again for zero offset" feature
let secondClickPosition: THREE.Vector3 | null = null;
const SAME_POINT_TOLERANCE = 0.15; // Distance threshold to consider it "same point"

// Preview objects
let previewLine: THREE.Line | null = null;
let previewDimensionLine: THREE.Line | null = null;
let previewExtensions: THREE.Line[] = [];

// Transform tracking for guide line updates
let trackedMeshes = new Map<number, { position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }>();


function clampToCanvasBounds(p: THREE.Vector3): THREE.Vector3 {
  const { width, height } = getDrawingBounds();
  const margin = 0.5; // 0.5 m each side

  const halfW = width / 2;
  const halfH = height / 2;

  const minX = -halfW + margin;
  const maxX =  halfW - margin;
  const minY = -halfH + margin;
  const maxY =  halfH - margin;

  const clamped = p.clone();
  clamped.x = Math.max(minX, Math.min(maxX, clamped.x));
  clamped.y = Math.max(minY, Math.min(maxY, clamped.y));
  return clamped;
}

/**
 * Helper: get best snap (point or edge) for current mouse position.
 */
function getBestSnap(mouseWorldPos: THREE.Vector3): { snap: SnapPoint | null; edge: SnapEdge | null } {
  let bestSnap: SnapPoint | null = null;
  let bestEdge: SnapEdge | null = null;
  let bestDist = Infinity;
  const snapThreshold = 0.3;
  const pointPriorityBias = 0.05;

  // 1) points (verts + midpoints + center)
  if (snapToPoints) {
    const allSnapPoints = collectAllSnapPoints(scene);
    const pointSnap = findNearestSnapPoint(mouseWorldPos, allSnapPoints);
    if (pointSnap) {
      const d = mouseWorldPos.distanceTo(pointSnap.position);
      if (d < snapThreshold) {
        bestDist = d;
        bestSnap = pointSnap;
        bestEdge = null;
      }
    }
  }

  // 2) edges (include guide lines if enabled)
  if (snapToEdges) {
    const includeGuides = showGuideLines;
    const allEdges = collectAllSnapEdges(scene, includeGuides);

    for (const edge of allEdges) {
      const candidate = findNearestEdgeSnap(mouseWorldPos, [edge], snapThreshold);
      if (!candidate) continue;
      
      const d = mouseWorldPos.distanceTo(candidate.position);
      
      if (d < snapThreshold && d < (bestDist - pointPriorityBias)) {
        bestDist = d;
        bestSnap = candidate;
        bestEdge = edge;
      }
    }
  }

  return { snap: bestSnap, edge: bestEdge };
}


/**
 * Resolve a SnapPoint's shape to the mesh UUID
 */
function findShapeUuidFromSnap(snap: SnapPoint): string | undefined {
  let foundUuid: string | undefined;

  scene.traverse(object => {
    if (object instanceof THREE.Mesh && object.id === snap.shapeId) {
      foundUuid = object.uuid;
    }
  });

  return foundUuid;
}

/**
 * Show or hide guide lines for all planes in the scene
 */
function toggleGuideLineVisibility(visible: boolean) {
  const existingGuides: THREE.Object3D[] = [];
  scene.traverse(object => {
    if ((object as any).isGuideLineGroup) {
      existingGuides.push(object);
    }
  });
  
  existingGuides.forEach(guide => {
    guide.parent?.remove(guide);
    guide.traverse(child => {
      if (child instanceof Line2) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  });

  if (visible) {
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.userData.geometryType === 'plane') {
        const guideLineGroup = createPlaneGuideLineVisuals(object);
        guideLineGroup.userData.planeMeshId = object.id;
        scene.add(guideLineGroup);
        trackMeshTransform(object);
      }
    });
  } else {
    trackedMeshes.clear();
  }
}

/**
 * Find which shape (if any) a point belongs to
 * Returns the shape's UUID if the point is on a snap point from that shape
 */
// function findShapeAtPoint(point: THREE.Vector3): string | undefined {
//   const snapThreshold = 0.01; // Very small threshold for exact match
  
//   // Collect all snap points from the scene
//   const allSnapPoints = collectAllSnapPoints(scene);
  
//   // Find if our point matches any snap point
//   for (const snapPoint of allSnapPoints) {
//     if (point.distanceTo(snapPoint.position) < snapThreshold) {
//       // Found a match! Now get the mesh by its id
//       let foundUuid: string | undefined = undefined;
      
//       scene.traverse((object) => {
//         if (object instanceof THREE.Mesh && object.id === snapPoint.shapeId) {
//           foundUuid = object.uuid;
//         }
//       });
      
//       // Return the UUID if found
//       if (foundUuid) {
//         return foundUuid;
//       }
//     }
//   }
  
//   return undefined;
// }




/**
 * Track a mesh's current transform state
 */
function trackMeshTransform(mesh: THREE.Mesh) {
  trackedMeshes.set(mesh.id, {
    position: mesh.position.clone(),
    rotation: mesh.rotation.clone(),
    scale: mesh.scale.clone()
  });
}

/**
 * Check if a mesh has been transformed and update its guide lines if needed
 */
function updateGuideLineIfTransformed(mesh: THREE.Mesh) {
  const tracked = trackedMeshes.get(mesh.id);
  if (!tracked) return;

  const hasChanged = 
    !mesh.position.equals(tracked.position) ||
    !mesh.rotation.equals(tracked.rotation) ||
    !mesh.scale.equals(tracked.scale);

  if (hasChanged) {
    updateGuideLines(mesh);
    trackMeshTransform(mesh);
  }
}

/**
 * Update guide lines for a specific plane mesh
 */
function updateGuideLines(planeMesh: THREE.Mesh) {
  const oldGuides: THREE.Object3D[] = [];
  scene.traverse(object => {
    if ((object as any).isGuideLineGroup && 
        object.userData.planeMeshId === planeMesh.id) {
      oldGuides.push(object);
    }
  });
  
  oldGuides.forEach(guide => {
    scene.remove(guide);
    guide.traverse(child => {
      if (child instanceof Line2) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  });

  const newGuideGroup = createPlaneGuideLineVisuals(planeMesh);
  newGuideGroup.userData.planeMeshId = planeMesh.id;
  scene.add(newGuideGroup);
}

/**
 * Check all tracked meshes for transforms
 */
export function updateAllGuideLines() {
  if (!snapToEdges || !showGuideLines) return;

  scene.traverse(object => {
    if (object instanceof THREE.Mesh && 
        object.userData.geometryType === 'plane' &&
        trackedMeshes.has(object.id)) {
      updateGuideLineIfTransformed(object);
    }
  });
}

/**
 * Handle mouse move during measure mode
 */
export function handleMeasureMouseMove(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!isMeasureMode()) {
    disposeSnapIndicator(scene);
    disposeEdgeIndicator(scene);
    clearPreview();
    return;
  }

  const mouseWorldPos = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPos) {
    disposeSnapIndicator(scene);
    disposeEdgeIndicator(scene);
    return;
  }

  // STATE 1: Waiting for first point
  if (!firstPoint) {
    const { snap, edge } = getBestSnap(mouseWorldPos);

    if (edge) {
      updateEdgeIndicator(edge, scene);
    } else {
      disposeEdgeIndicator(scene);
    }

    if (snap) {
      updateSnapIndicator(snap, scene);
      currentSnapPoint = snap.position.clone();
    } else if (allowFreeMeasurement) {
      disposeSnapIndicator(scene);
      currentSnapPoint = mouseWorldPos.clone();
    } else {
      disposeSnapIndicator(scene);
      currentSnapPoint = null;
    }
    return;
  }

  // STATE 2: Have first point, waiting for second point
  if (!secondPoint) {
    const { snap, edge } = getBestSnap(mouseWorldPos);

    if (edge) {
      updateEdgeIndicator(edge, scene);
    } else {
      disposeEdgeIndicator(scene);
    }

    if (snap) {
      updateSnapIndicator(snap, scene);
      currentSnapPoint = snap.position.clone();
    } else if (allowFreeMeasurement) {
      disposeSnapIndicator(scene);
      currentSnapPoint = mouseWorldPos.clone();
    } else {
      disposeSnapIndicator(scene);
      currentSnapPoint = null;
    }

    if (currentSnapPoint) {
      updatePreviewLine(firstPoint, currentSnapPoint);
    } else {
      clearPreview();
    }
    return;
  }

  // STATE 3: Have both points, positioning dimension line
  if (firstPoint && secondPoint) {
    disposeSnapIndicator(scene);
    disposeEdgeIndicator(scene);
    
    currentSnapPoint = mouseWorldPos.clone();

    const rawOffset = calculateDimensionOffset(
      firstPoint,
      secondPoint,
      mouseWorldPos
    );

    
    previewDimensionOffset = clampDimensionOffset(rawOffset, 20);
    updatePreviewDimension(firstPoint, secondPoint, previewDimensionOffset);

  }
}

/**
 * Handle click during measure mode
 */
export function handleMeasureClick(
  event: MouseEvent,
  domElement: HTMLElement
) {
  const settings = getMeasurementSettings();

  if (!isMeasureMode()) return;

  const mouseWorldPos = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPos) return;

  const { snap, edge } = getBestSnap(mouseWorldPos);

  if (edge) {
    updateEdgeIndicator(edge, scene);
  } else {
    disposeEdgeIndicator(scene);
  }

  // CLICK 1 & 2: Need valid snap point (respect snap settings)
  if (!firstPoint || !secondPoint) {
    if (snap) {
      currentSnapPoint = snap.position.clone();
    } else if (allowFreeMeasurement) {
      currentSnapPoint = mouseWorldPos.clone();
    } else {
      return;
    }
  }

  // CLICK 1: Set first point
  if (!firstPoint) {
    if (!currentSnapPoint) return;
    firstPoint = clampToCanvasBounds(currentSnapPoint);
    secondClickPosition = null; 

    firstPointShapeUuid = snap ? findShapeUuidFromSnap(snap) : undefined;
    
    return;
  }

  // CLICK 2: Set second point
  if (!secondPoint) {
    if (!currentSnapPoint) return;
    const distance = firstPoint.distanceTo(currentSnapPoint);
    // const minThreshold = 0.1;
    
    if (distance < MIN_DIMENSION_LENGTH_M) {
      
      return;
    }
    
    secondPoint = clampToCanvasBounds(currentSnapPoint);
    secondClickPosition = currentSnapPoint.clone(); 
    clearPreview();
    previewDimensionOffset = settings.defaultDimensionOffset;
    
secondPointShapeUuid = snap ? findShapeUuidFromSnap(snap) : undefined;

    return;
  }

  // CLICK 3: Finalize dimension line position
  if (firstPoint && secondPoint && secondClickPosition) {
    let finalOffset: number;
    
    
    const distanceToSecondClick = mouseWorldPos.distanceTo(secondClickPosition);
    
    if (distanceToSecondClick < SAME_POINT_TOLERANCE) {
      
      finalOffset = 0;
      
    } else {
      
      finalOffset = clampDimensionOffset(previewDimensionOffset, 20);
      
    }

    // const startShapeId = findShapeAtPoint(firstPoint);
    // const endShapeId = findShapeAtPoint(secondPoint);
    
    const measurement = addMeasurement(
      firstPoint,
      secondPoint,
      finalOffset
    );

    attachMeasurementToShapes(
      measurement.id,
      firstPoint,
      secondPoint,
      firstPointShapeUuid,
      secondPointShapeUuid
    );
    
    renderMeasurement(measurement, canvas);
    
    // Reset state for next measurement
    const newSettings = getMeasurementSettings();
    firstPoint = null;
    secondPoint = null;
    currentSnapPoint = null;
    secondClickPosition = null; 
    firstPointShapeUuid = undefined;
secondPointShapeUuid = undefined;
    previewDimensionOffset = newSettings.defaultDimensionOffset;
    clearPreview();
    
    
  }
}

/**
 * Update preview line (point-to-point)
 */
function updatePreviewLine(start: THREE.Vector3, end: THREE.Vector3) {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    (previewLine.material as THREE.Material).dispose();
  }

  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineDashedMaterial({
    color: 0xFF8040,
    dashSize: 0.2,
    gapSize: 0.1,
    linewidth: 1
  });

  previewLine = new THREE.Line(geometry, material);
  previewLine.computeLineDistances();
  previewLine.renderOrder = 998;
  (previewLine as any).isUiOnly = true;

  scene.add(previewLine);
}

/**
 * Update preview of dimension line with extensions
 */
function updatePreviewDimension(
  start: THREE.Vector3,
  end: THREE.Vector3,
  offset: number
) {
  const settings = getMeasurementSettings();
  
  clearPreview();

  const lineDirection = new THREE.Vector3().subVectors(end, start).normalize();
  const perpDirection = new THREE.Vector3(-lineDirection.y, lineDirection.x, 0);

  const dimStart = start.clone().add(perpDirection.clone().multiplyScalar(offset));
  const dimEnd = end.clone().add(perpDirection.clone().multiplyScalar(offset));

  const dimGeometry = new THREE.BufferGeometry().setFromPoints([dimStart, dimEnd]);
  const dimMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    linewidth: 2,
    transparent: true,
    opacity: 0.7
  });

  previewDimensionLine = new THREE.Line(dimGeometry, dimMaterial);
  previewDimensionLine.renderOrder = 999;
  (previewDimensionLine as any).isUiOnly = true;
  scene.add(previewDimensionLine);

  const extOverhang = settings.extensionOverhang;
  const totalExtensionLength = Math.abs(offset) + extOverhang;
  const extensionDirection = offset >= 0 ? perpDirection : perpDirection.clone().negate();

  // Extension 1
  const ext1Start = start.clone();
  const ext1End = start.clone().add(
    extensionDirection.clone().multiplyScalar(totalExtensionLength)
  );
  const ext1Geometry = new THREE.BufferGeometry().setFromPoints([ext1Start, ext1End]);
  const ext1Material = new THREE.LineBasicMaterial({
    color: 0xff6d1f,
    linewidth: 1,
    transparent: true,
    opacity: 0.7
  });
  const ext1 = new THREE.Line(ext1Geometry, ext1Material);
  ext1.renderOrder = 998;
  (ext1 as any).isUiOnly = true;
  scene.add(ext1);
  previewExtensions.push(ext1);

  // Extension 2
  const ext2Start = end.clone();
  const ext2End = end.clone().add(
    extensionDirection.clone().multiplyScalar(totalExtensionLength)
  );
  const ext2Geometry = new THREE.BufferGeometry().setFromPoints([ext2Start, ext2End]);
  const ext2Material = new THREE.LineBasicMaterial({
    color: 0xff6d1f,
    linewidth: 1,
    transparent: true,
    opacity: 0.7
  });
  const ext2 = new THREE.Line(ext2Geometry, ext2Material);
  ext2.renderOrder = 998;
  (ext2 as any).isUiOnly = true;
  scene.add(ext2);
  previewExtensions.push(ext2);
}

/**
 * Clear all preview objects
 */
function clearPreview() {
  if (previewLine) {
    scene.remove(previewLine);
    previewLine.geometry.dispose();
    (previewLine.material as THREE.Material).dispose();
    previewLine = null;
  }

  if (previewDimensionLine) {
    scene.remove(previewDimensionLine);
    previewDimensionLine.geometry.dispose();
    (previewDimensionLine.material as THREE.Material).dispose();
    previewDimensionLine = null;
  }

  previewExtensions.forEach(ext => {
    scene.remove(ext);
    ext.geometry.dispose();
    (ext.material as THREE.Material).dispose();
  });
  previewExtensions = [];
}

/**
 * Start measure mode
 */
export function startMeasureMode() {
  const settings = getMeasurementSettings();
  setMeasureMode(true);
  firstPoint = null;
  secondPoint = null;
  currentSnapPoint = null;
  secondClickPosition = null; 
  firstPointShapeUuid = undefined;
  secondPointShapeUuid = undefined;
  previewDimensionOffset = settings.defaultDimensionOffset;
  clearPreview();
  
  if (snapToEdges && showGuideLines) {
    toggleGuideLineVisibility(true);
  }
}

/**
 * Exit measure mode
 */
export function exitMeasureMode() {
  const settings = getMeasurementSettings();
  setMeasureMode(false);
  firstPoint = null;
  secondPoint = null;
  currentSnapPoint = null;
  secondClickPosition = null; 
  firstPointShapeUuid = undefined;
  secondPointShapeUuid = undefined;
  previewDimensionOffset = settings.defaultDimensionOffset;
  disposeSnapIndicator(scene);
  disposeEdgeIndicator(scene);
  clearPreview();
  
  toggleGuideLineVisibility(false);
}

/**
 * Get current measurement state
 */
export function getMeasurementState() {
  return {
    hasFirstPoint: firstPoint !== null,
    hasSecondPoint: secondPoint !== null,
    isPositioning: firstPoint !== null && secondPoint !== null
  };
}

/**
 * Enable/disable snap to points
 */
export function setSnapToPoints(enabled: boolean) {
  snapToPoints = enabled;
}

/**
 * Enable/disable snap to edges
 */
export function setSnapToEdges(enabled: boolean) {
  snapToEdges = enabled;
  
  if (isMeasureMode() && showGuideLines) {
    toggleGuideLineVisibility(enabled);
  }
}

/**
 * Enable/disable free measurement
 */
export function setAllowFreeMeasurement(enabled: boolean) {
  allowFreeMeasurement = enabled;
}

/**
 * Enable/disable guide line visibility
 */
export function setShowGuideLines(enabled: boolean) {
  showGuideLines = enabled;
  
  if (isMeasureMode() && snapToEdges) {
    toggleGuideLineVisibility(enabled);
  }
}

/**
 * Manually trigger guide line update for a specific mesh
 */
export function updateGuideLineForMesh(mesh: THREE.Mesh) {
  if (snapToEdges && showGuideLines && mesh.userData.geometryType === 'plane') {
    updateGuideLines(mesh);
    trackMeshTransform(mesh);
  }
}
