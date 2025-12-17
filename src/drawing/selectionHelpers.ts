// src/drawing/selectionHelpers.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';
import { 
  showDashedOutline, 
  clearDashedOutline 
} from './dashedOutline';
import { 
  showResizeHandles, 
  clearResizeHandles 
} from './resizeHandles';
import { 
  showRotateHandle, 
  clearRotateHandle 
} from './rotateHandle';

/**
 * Main function to update all selection visuals
 */
export function updateSelectionHelpers() {
  clearSelectionHelpers();

  const selectedObject = getSelectedObject();
  if (!selectedObject) return;

  const boundingBox = new THREE.Box3().setFromObject(selectedObject);
  if (!boundingBox || boundingBox.isEmpty()) return;

  // Pass selectedObject to get oriented outline
  showDashedOutline(selectedObject);  // ← Changed
  showResizeHandles(selectedObject, boundingBox);
  
  const isLine = selectedObject instanceof THREE.Line;
  if (!isLine) {
    showRotateHandle(selectedObject);
  }
}

export function clearSelectionHelpers() {
  clearDashedOutline();
  clearResizeHandles();
  clearRotateHandle();
}
