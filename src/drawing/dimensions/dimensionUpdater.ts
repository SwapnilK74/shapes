// src/drawing/dimensions/dimensionUpdater.ts
import * as THREE from 'three';
import { clearAllDimensions } from './dimensionManager';
import { createPlaneDimensions } from './planeDimensions';
import { createCircleDimensions } from './circleDimensions';
import { createTriangleDimensions } from './triangleDimensions';




let dimensionsEnabled = true;

export function setDimensionsEnabled(enabled: boolean) {
  dimensionsEnabled = enabled;


}

export function areDimensionsEnabled(): boolean {
  return dimensionsEnabled;
}


export function refreshDimensionsForObject(selectedObject: THREE.Object3D | null) {

  
  if (!dimensionsEnabled || !selectedObject){
  clearAllDimensions();
   return;
}

clearAllDimensions();
 

  if (selectedObject instanceof THREE.Mesh) {
    const geometryType = selectedObject.userData.geometryType;

    if (geometryType === 'plane') {
      createPlaneDimensions(selectedObject);
    } else if (geometryType === 'circle') {
      createCircleDimensions(selectedObject);
    } else if (geometryType === 'triangle') {
      createTriangleDimensions(selectedObject);
    } else {
      
      if (selectedObject.geometry instanceof THREE.CircleGeometry) {
        createCircleDimensions(selectedObject);
      } else if (selectedObject.geometry instanceof THREE.PlaneGeometry) {
        createPlaneDimensions(selectedObject);
      }
    }
  }
}

