// src/drawing/triangleResize.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';
import { updateSelectionHelpers } from './selectionHelpers';
import { projectMouseToPlaneForDom } from './sharedPointer';
import { refreshDimensionsForObject } from './dimensions/dimensionUpdater';


let activeHandleRole: 'triangle-base' | 'triangle-height' | null = null;


const startMouseWorldPos = new THREE.Vector3();
let isDragInitialized = false; 

const startApexWorldPos = new THREE.Vector3();
const startBottomCenterWorldPos = new THREE.Vector3();
const worldUpVector = new THREE.Vector3();
const worldRightVector = new THREE.Vector3();

let initialHeightLength = 0;
let initialHalfBaseLength = 0;


export function beginTriangleResize(handleObject: THREE.Object3D) {
  const role = (handleObject as any).userData.handleRole as
    | 'triangle-base'
    | 'triangle-height'
    | undefined;

  if (!role) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

 
  const geometry = mesh.geometry;
  const pos = geometry.getAttribute('position');

 
  const localApex = new THREE.Vector3(pos.getX(0), pos.getY(0), 0);
  const localBottomRight = new THREE.Vector3(pos.getX(2), pos.getY(2), 0);
  const localBaseCenter = new THREE.Vector3(0, localBottomRight.y, 0);

  
  const worldApex = localApex.clone().applyMatrix4(mesh.matrixWorld);
  const worldBaseCenter = localBaseCenter.clone().applyMatrix4(mesh.matrixWorld);
  const worldBottomRight = localBottomRight.clone().applyMatrix4(mesh.matrixWorld);

  startApexWorldPos.copy(worldApex);
  startBottomCenterWorldPos.copy(worldBaseCenter);

  
  worldUpVector.subVectors(worldApex, worldBaseCenter).normalize();
  worldRightVector.subVectors(worldBottomRight, worldBaseCenter).normalize();

  
  initialHeightLength = worldApex.distanceTo(worldBaseCenter);
  initialHalfBaseLength = worldBaseCenter.distanceTo(worldBottomRight);

  activeHandleRole = role;
  isDragInitialized = false; 
}


export function updateTriangleResize(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!activeHandleRole) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  const currentMousePos = projectMouseToPlaneForDom(event, domElement);
  if (!currentMousePos) return;


  if (!isDragInitialized) {
    startMouseWorldPos.copy(currentMousePos);
    isDragInitialized = true;
    
    return; 
  }

  
  const mouseDragVector = new THREE.Vector3().subVectors(currentMousePos, startMouseWorldPos);
  
  let newHeight = initialHeightLength;
  let newHalfBase = initialHalfBaseLength;
  const parent = mesh.parent || mesh;

  if (activeHandleRole === 'triangle-height') {
    
    const dragDistance = mouseDragVector.dot(worldUpVector);
    newHeight = Math.max(initialHeightLength + dragDistance, 0.1);

    
    const newApexWorldPos = startBottomCenterWorldPos.clone().addScaledVector(worldUpVector, newHeight);
    
    
    const newLocalPos = newApexWorldPos.clone();
    parent.worldToLocal(newLocalPos);
    mesh.position.set(newLocalPos.x, newLocalPos.y, mesh.position.z);
    mesh.updateMatrix();

  } else {
   
    const dragDistance = mouseDragVector.dot(worldRightVector);
    newHalfBase = Math.max(initialHalfBaseLength + dragDistance, 0.1);

    
    const newLocalPos = startApexWorldPos.clone();
    parent.worldToLocal(newLocalPos);
    mesh.position.set(newLocalPos.x, newLocalPos.y, mesh.position.z);
    mesh.updateMatrix();
  }

  
  if (event.shiftKey) {
     if (activeHandleRole === 'triangle-height') {
        const scale = newHeight / Math.max(initialHeightLength, 0.01);
        newHalfBase = initialHalfBaseLength * scale;
     } else {
        const scale = newHalfBase / Math.max(initialHalfBaseLength, 0.01);
        newHeight = initialHeightLength * scale;
     }
  }

  updateTriangleGeometry(mesh, newHalfBase, newHeight);
  updateSelectionHelpers();
  refreshDimensionsForObject(mesh);
}

export function endTriangleResize() {
  activeHandleRole = null;
  isDragInitialized = false;
}


function updateTriangleGeometry(mesh: THREE.Mesh, halfBase: number, height: number) {
  setVertexPositions(mesh.geometry, halfBase, height);
  mesh.children.forEach((child) => {
    if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
      setVertexPositions(child.geometry, halfBase, height);
    }
  });
}

function setVertexPositions(geometry: THREE.BufferGeometry, halfBase: number, height: number) {
  const pos = geometry.getAttribute('position');
  if (!pos) return;
  pos.setXY(0, 0, 0);
  pos.setXY(1, -halfBase, -height);
  pos.setXY(2, halfBase, -height);
  if (pos.count > 3) pos.setXY(3, 0, 0);
  pos.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}
