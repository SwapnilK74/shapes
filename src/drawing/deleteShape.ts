// src/drawing/deleteShape.ts
import * as THREE from 'three';
import { scene } from '../core/scene';
import { getSelectedObject, clearSelection } from './selection';
import { removeMeasurementsForShape } from './measurements/trackMeasurement';

export function deleteSelectedShape(): boolean {
  const selectedObject = getSelectedObject();
  
  if (!selectedObject) {
    return false;
  }

  removeMeasurementsForShape(selectedObject.uuid);

  // Remove from scene
  scene.remove(selectedObject);

  // Dispose geometry and materials to free memory
  if (selectedObject instanceof THREE.Mesh) {
    selectedObject.geometry.dispose();
    
    if (selectedObject.material instanceof THREE.Material) {
      selectedObject.material.dispose();
    }

    // Dispose child objects (like outline)
    selectedObject.children.forEach((child) => {
      if (child instanceof THREE.Line || child instanceof THREE.LineLoop) {
        (child.geometry as THREE.BufferGeometry).dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  } else if (selectedObject instanceof THREE.Line) {
    (selectedObject.geometry as THREE.BufferGeometry).dispose();
    if (selectedObject.material instanceof THREE.Material) {
      selectedObject.material.dispose();
    }
  }

  // Clear selection
  clearSelection();

  return true;
}
