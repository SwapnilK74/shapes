// src/drawing/measurements/edgeIndicator.ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import type { SnapEdge } from './snapEdges';
import { 
  createEdgeHighlightLine,
  createCircleGuideLineVisuals,
  createPlaneGuideLineVisuals 
} from './snapEdges';

let currentEdgeIndicator: Line2 | null = null;
let persistentGuideLines: THREE.Group[] = [];

/**
 * Show / update edge highlight for the currently snapped edge.
 * Pass null edge to hide the indicator.
 */
export function updateEdgeIndicator(edge: SnapEdge | null, scene: THREE.Scene) {
  // Remove old indicator if present
  if (currentEdgeIndicator) {
    scene.remove(currentEdgeIndicator);
    if (currentEdgeIndicator.geometry) currentEdgeIndicator.geometry.dispose();
    if (Array.isArray(currentEdgeIndicator.material)) {
      currentEdgeIndicator.material.forEach(m => m.dispose());
    } else {
      currentEdgeIndicator.material.dispose();
    }
    currentEdgeIndicator = null;
  }

  // Nothing to show
  if (!edge) return;

  // Create new indicator line
  const line = createEdgeHighlightLine(edge);
  scene.add(line);
  currentEdgeIndicator = line;
}

/**
 * Show persistent guide lines for all shapes in the scene.
 * Called when entering edge/measurement mode.
 */
export function showAllGuideLines(scene: THREE.Scene) {
  // Clear any existing guide lines first
  clearAllGuideLines(scene);

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const geometryType = object.userData.geometryType;

    if (geometryType === 'circle') {
      const guideLines = createCircleGuideLineVisuals(object);
      scene.add(guideLines);
      persistentGuideLines.push(guideLines);
    } else if (geometryType === 'plane') {
      const guideLines = createPlaneGuideLineVisuals(object);
      scene.add(guideLines);
      persistentGuideLines.push(guideLines);
    }
    // TODO: Add triangle guide lines when ready
  });
}

/**
 * Clear all persistent guide lines from the scene.
 * Called when exiting edge/measurement mode.
 */
export function clearAllGuideLines(scene: THREE.Scene) {
  persistentGuideLines.forEach(guideGroup => {
    scene.remove(guideGroup);
    
    // Dispose all Line2 objects in the group
    guideGroup.traverse((child) => {
      if (child instanceof Line2) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  });

  persistentGuideLines = [];
}

/**
 * Update guide lines for a specific shape (e.g., after resize/rotate).
 * Useful when a shape changes and its guide lines need to be recalculated.
 */
export function updateGuideLineForShape(mesh: THREE.Mesh, scene: THREE.Scene) {
  const geometryType = mesh.userData.geometryType;
  
  // Find and remove old guide lines for this specific shape
  const oldGuideIndex = persistentGuideLines.findIndex(group => {
    // Check if this guide group belongs to this mesh by comparing positions
    const groupPos = new THREE.Vector3();
    group.getWorldPosition(groupPos);
    const meshPos = new THREE.Vector3();
    mesh.getWorldPosition(meshPos);
    return groupPos.distanceTo(meshPos) < 0.01;
  });

  if (oldGuideIndex !== -1) {
    const oldGuide = persistentGuideLines[oldGuideIndex];
    scene.remove(oldGuide);
    oldGuide.traverse((child) => {
      if (child instanceof Line2) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    persistentGuideLines.splice(oldGuideIndex, 1);
  }

  // Create new guide lines
  if (geometryType === 'circle') {
    const guideLines = createCircleGuideLineVisuals(mesh);
    scene.add(guideLines);
    persistentGuideLines.push(guideLines);
  } else if (geometryType === 'plane') {
    const guideLines = createPlaneGuideLineVisuals(mesh);
    scene.add(guideLines);
    persistentGuideLines.push(guideLines);
  }
}

/**
 * Dispose completely (e.g. when leaving measure mode).
 */
export function disposeEdgeIndicator(scene: THREE.Scene) {
  // Dispose hover indicator
  if (currentEdgeIndicator) {
    scene.remove(currentEdgeIndicator);
    if (currentEdgeIndicator.geometry) currentEdgeIndicator.geometry.dispose();
    if (Array.isArray(currentEdgeIndicator.material)) {
      currentEdgeIndicator.material.forEach(m => m.dispose());
    } else {
      currentEdgeIndicator.material.dispose();
    }
    currentEdgeIndicator = null;
  }

  // Clear all persistent guide lines
  clearAllGuideLines(scene);
}
