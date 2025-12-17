// src/drawing/lineResize.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';
import { updateSelectionHelpers } from './selectionHelpers';
import { projectMouseToPlaneForDom } from './sharedPointer';


let activeLineHandleRole: 'line-start' | 'line-end' | null = null;


export function beginLineResize(handleObject: THREE.Object3D) {
  const handleRole = (handleObject as any).userData.handleRole as string | undefined;
  
  if (!handleRole) return;

  const selectedLine = getSelectedObject();
  if (!selectedLine || !(selectedLine instanceof THREE.Line)) return;

  
  if (handleRole === 'line-start') {
    activeLineHandleRole = 'line-start';
  } else if (handleRole === 'line-end') {
    activeLineHandleRole = 'line-end';
  }
}


export function updateLineResize(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!activeLineHandleRole) return;

  const selectedLine = getSelectedObject();
  if (!selectedLine || !(selectedLine instanceof THREE.Line)) return;

  const mouseWorldPosition = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPosition) return;

  
  const mouseLocalPosition = mouseWorldPosition.clone();
  selectedLine.worldToLocal(mouseLocalPosition);

  
  const positionAttribute = selectedLine.geometry.getAttribute('position');
  if (!positionAttribute) return;

  
  const vertexIndex = activeLineHandleRole === 'line-start' ? 0 : 1;

  
  const currentVertexZ = positionAttribute.getZ(vertexIndex);

 
  positionAttribute.setXYZ(
    vertexIndex, 
    mouseLocalPosition.x, 
    mouseLocalPosition.y, 
    currentVertexZ
  );

  
  positionAttribute.needsUpdate = true;

  
  selectedLine.geometry.computeBoundingBox();
  selectedLine.geometry.computeBoundingSphere();

 
  updateSelectionHelpers();
}


export function endLineResize() {
  activeLineHandleRole = null;
}
