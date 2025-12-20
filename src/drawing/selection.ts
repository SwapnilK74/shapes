// src/drawing/selection.ts
import * as THREE from 'three';
import {
  updateSelectionHelpers,
  clearSelectionHelpers
} from './selectionHelpers';
import { refreshDimensionsForObject } from './dimensions/dimensionUpdater';

let selected: THREE.Object3D | null = null;

export function getSelectedObject() {
  return selected;
}

export function setSelectedObject(obj: THREE.Object3D | null) {
  selected = obj;

  if (selected) {
    updateSelectionHelpers();  // ← Changed from updateSelectionHelperOutline
    // refreshDimensionsForObject(selected);
  } else {
    clearSelectionHelpers();   // ← Changed from clearSelectionHelperOutline
    refreshDimensionsForObject(null);
  }
}

export function clearSelection() {
  setSelectedObject(null);
}

export function setSelectedColor(hex: string) {
  if (!selected) return;

  if (selected instanceof THREE.Mesh || selected instanceof THREE.Line) {
    if (!Array.isArray(selected.material)) {
      selected.material = selected.material.clone();
      const mat = selected.material as THREE.MeshBasicMaterial;
      if ((mat as any).color) {
        mat.color.set(hex);
        mat.needsUpdate = true;
      }
    }
  }
}
