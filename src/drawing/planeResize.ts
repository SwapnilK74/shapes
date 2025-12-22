// src/drawing/planeResize.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';
import { updateSelectionHelpers } from './selectionHelpers';
import { projectMouseToPlaneForDom } from './sharedPointer';
import { refreshDimensionsForObject } from './dimensions/dimensionUpdater';
import { updateMeasurementsForShape } from './measurements/trackMeasurement';
import { getShapeMeta, setShapeMeta } from './shapeMetadata';


// --- STATE VARIABLES ---
let activePlaneHandleRole: 'plane-right' | 'plane-top' | null = null;
const initialPlaneCenter = new THREE.Vector2();
let initialWidth = 1;
let initialHeight = 1;
let initialMouseLocal = new THREE.Vector2(); // ← NEW: Store initial mouse in local space

let meshUnitPositionCache: Float32Array | null = null;
let outlineUnitPositionCache: Float32Array | null = null;

export function beginPlaneResize(handleObject: THREE.Object3D) {
  const role = (handleObject as any).userData.handleRole as
    | 'plane-right'
    | 'plane-top'
    | undefined;

  if (!role) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  initialPlaneCenter.set(mesh.position.x, mesh.position.y);

  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox!;
  
  initialWidth = boundingBox.max.x - boundingBox.min.x;
  initialHeight = boundingBox.max.y - boundingBox.min.y;

  if (initialWidth < 0.001) initialWidth = 0.1;
  if (initialHeight < 0.001) initialHeight = 0.1;

  // Cache unit positions
  const positionAttribute = mesh.geometry.getAttribute('position');
  const vertexCount = positionAttribute.count;
  
  meshUnitPositionCache = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const vertexX = positionAttribute.getX(i);
    const vertexY = positionAttribute.getY(i);
    const vertexZ = positionAttribute.getZ(i);
    
    meshUnitPositionCache[i * 3] = vertexX / initialWidth;
    meshUnitPositionCache[i * 3 + 1] = vertexY / initialHeight;
    meshUnitPositionCache[i * 3 + 2] = vertexZ;
  }

  // Cache outline unit positions
  const outlineChild = mesh.children.find(
    (child) => child instanceof THREE.Line || child instanceof THREE.LineSegments
  ) as THREE.Line | undefined;

  if (outlineChild) {
    const linePositionAttribute = outlineChild.geometry.getAttribute('position');
    const lineVertexCount = linePositionAttribute.count;
    
    outlineUnitPositionCache = new Float32Array(lineVertexCount * 3);
    
    for (let i = 0; i < lineVertexCount; i++) {
      const lineVertexX = linePositionAttribute.getX(i);
      const lineVertexY = linePositionAttribute.getY(i);
      const lineVertexZ = linePositionAttribute.getZ(i);

      outlineUnitPositionCache[i * 3] = lineVertexX / initialWidth;
      outlineUnitPositionCache[i * 3 + 1] = lineVertexY / initialHeight;
      outlineUnitPositionCache[i * 3 + 2] = lineVertexZ;
    }
  } else {
    outlineUnitPositionCache = null;
  }

  // ← NEW: Reset initial mouse position
  initialMouseLocal.set(0, 0);

  activePlaneHandleRole = role;
}

export function updatePlaneResize(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!activePlaneHandleRole || !meshUnitPositionCache) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  const mouseWorldPosition = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPosition) return;

  // ← NEW: Transform mouse from world space to local space
  const meshRotation = mesh.rotation.z;
  const cos = Math.cos(-meshRotation); // Negative for inverse rotation
  const sin = Math.sin(-meshRotation);

  // Translate mouse to origin (relative to mesh center)
  const relativeX = mouseWorldPosition.x - initialPlaneCenter.x;
  const relativeY = mouseWorldPosition.y - initialPlaneCenter.y;

  // Rotate into local space
  const mouseLocalX = relativeX * cos - relativeY * sin;
  const mouseLocalY = relativeX * sin + relativeY * cos;

  // ← NEW: Capture initial mouse position on first frame
  if (initialMouseLocal.x === 0 && initialMouseLocal.y === 0) {
    initialMouseLocal.set(mouseLocalX, mouseLocalY);
    return; // Skip first frame to avoid jump
  }

  let newWidth = initialWidth;
  let newHeight = initialHeight;

  if (activePlaneHandleRole === 'plane-right') {
    // Calculate new width based on local X distance
    const localOffsetX = Math.abs(mouseLocalX);
    newWidth = Math.max(localOffsetX * 2, 0.2);

    if (event.shiftKey) {
      const scaleRatio = newWidth / initialWidth;
      newHeight = initialHeight * scaleRatio;
    }

  } else if (activePlaneHandleRole === 'plane-top') {
    // Calculate new height based on local Y distance
    const localOffsetY = Math.abs(mouseLocalY);
    newHeight = Math.max(localOffsetY * 2, 0.2);

    if (event.shiftKey) {
      const scaleRatio = newHeight / initialHeight;
      newWidth = initialWidth * scaleRatio;
    }
  }

  updateGeometryVertices(
    mesh.geometry, 
    meshUnitPositionCache, 
    newWidth, 
    newHeight
  );

  const outlineChild = mesh.children.find(
    (child) => child instanceof THREE.Line || child instanceof THREE.LineSegments
  ) as THREE.Line | undefined;

  if (outlineChild && outlineUnitPositionCache) {
    updateGeometryVertices(
      outlineChild.geometry, 
      outlineUnitPositionCache, 
      newWidth, 
      newHeight
    );
  }

  
 updateMeasurementsForShape(mesh.uuid);
  updateSelectionHelpers();
  refreshDimensionsForObject(mesh);

  const bbox = mesh.geometry.boundingBox;
if (bbox) {
  const newWidth = bbox.max.x - bbox.min.x;
  const newHeight = bbox.max.y - bbox.min.y;

  const meta = getShapeMeta(mesh);
  if (meta && meta.kind === 'plane') {
    meta.width = newWidth;
    meta.height = newHeight;
    meta.center = new THREE.Vector2(mesh.position.x, mesh.position.y);
    setShapeMeta(mesh, meta);
  }
}
}

export function endPlaneResize() {
  activePlaneHandleRole = null;
  meshUnitPositionCache = null;
  outlineUnitPositionCache = null;
  initialMouseLocal.set(0, 0); // ← NEW: Reset
}

function updateGeometryVertices(
  geometry: THREE.BufferGeometry, 
  unitCache: Float32Array, 
  width: number, 
  height: number
) {
  const positionAttribute = geometry.getAttribute('position');
  const vertexCount = positionAttribute.count;

  for (let i = 0; i < vertexCount; i++) {
    const unitX = unitCache[i * 3];
    const unitY = unitCache[i * 3 + 1];
    const unitZ = unitCache[i * 3 + 2];

    positionAttribute.setXYZ(i, unitX * width, unitY * height, unitZ);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}
