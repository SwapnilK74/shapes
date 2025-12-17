// src/drawing/circleResize.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';
import { updateSelectionHelpers } from './selectionHelpers';
import { projectMouseToPlaneForDom } from './sharedPointer';
import { refreshDimensionsForObject } from './dimensions/dimensionUpdater';

// --- STATE VARIABLES ---
let activeCircleHandleRole: 'ellipse-rx' | 'ellipse-ry' | null = null;
const initialEllipseCenter = new THREE.Vector2();
let initialRadiusX = 1;
let initialRadiusY = 1;
let initialMouseLocal = new THREE.Vector2(); // ← NEW: Store initial mouse in local space

// Cache to store original "Unit Circle" positions (normalized to -1 to 1 range)
let meshUnitPositionCache: Float32Array | null = null;
let outlineUnitPositionCache: Float32Array | null = null;

/**
 * Starts the circle resize operation.
 * Captures the initial geometry state and creates a normalized "unit" cache.
 */
export function beginCircleResize(handleObject: THREE.Object3D) {
  const role = (handleObject as any).userData.handleRole as
    | 'ellipse-rx'
    | 'ellipse-ry'
    | undefined;

  if (!role) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  // 1. Store Center Position
  initialEllipseCenter.set(mesh.position.x, mesh.position.y);

  // 2. Measure Current Dimensions from Geometry Bounding Box
  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox!;
  
  // Calculate current radii (Half width / Half height)
  initialRadiusX = (boundingBox.max.x - boundingBox.min.x) / 2;
  initialRadiusY = (boundingBox.max.y - boundingBox.min.y) / 2;

  // Prevent division by zero for flat shapes
  if (initialRadiusX < 0.001) initialRadiusX = 0.1;
  if (initialRadiusY < 0.001) initialRadiusY = 0.1;

  // 3. Build "Unit Cache" for the Main Mesh
  const positionAttribute = mesh.geometry.getAttribute('position');
  const vertexCount = positionAttribute.count;
  
  meshUnitPositionCache = new Float32Array(vertexCount * 3);

  for (let i = 0; i < vertexCount; i++) {
    const vertexX = positionAttribute.getX(i);
    const vertexY = positionAttribute.getY(i);
    const vertexZ = positionAttribute.getZ(i);
    
    // Normalize: If x was 50 and radius was 50, unitX becomes 1.0
    meshUnitPositionCache[i * 3] = vertexX / initialRadiusX;
    meshUnitPositionCache[i * 3 + 1] = vertexY / initialRadiusY;
    meshUnitPositionCache[i * 3 + 2] = vertexZ;
  }

  // 4. Build Cache for the Outline (Child Line) if it exists
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

      outlineUnitPositionCache[i * 3] = lineVertexX / initialRadiusX;
      outlineUnitPositionCache[i * 3 + 1] = lineVertexY / initialRadiusY;
      outlineUnitPositionCache[i * 3 + 2] = lineVertexZ;
    }
  } else {
    outlineUnitPositionCache = null;
  }

  // ← NEW: Reset initial mouse position
  initialMouseLocal.set(0, 0);

  activeCircleHandleRole = role;
}

/**
 * Updates the circle shape during mouse drag.
 * Calculates new radii and applies them to the vertex buffers.
 */
export function updateCircleResize(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!activeCircleHandleRole || !meshUnitPositionCache) return;

  const mesh = getSelectedObject();
  if (!mesh || !(mesh instanceof THREE.Mesh)) return;

  const mouseWorldPosition = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPosition) return;

  // ← NEW: Transform mouse from world space to local space
  const meshRotation = mesh.rotation.z;
  const cos = Math.cos(-meshRotation); // Negative for inverse rotation
  const sin = Math.sin(-meshRotation);

  // Translate mouse to origin (relative to mesh center)
  const relativeX = mouseWorldPosition.x - initialEllipseCenter.x;
  const relativeY = mouseWorldPosition.y - initialEllipseCenter.y;

  // Rotate into local space
  const mouseLocalX = relativeX * cos - relativeY * sin;
  const mouseLocalY = relativeX * sin + relativeY * cos;

  // ← NEW: Capture initial mouse position on first frame
  if (initialMouseLocal.x === 0 && initialMouseLocal.y === 0) {
    initialMouseLocal.set(mouseLocalX, mouseLocalY);
    return; // Skip first frame to avoid jump
  }

  // Calculate distance in LOCAL space (not world space!)
  const localOffsetX = Math.abs(mouseLocalX);
  const localOffsetY = Math.abs(mouseLocalY);

  let newRadiusX = initialRadiusX;
  let newRadiusY = initialRadiusY;

  // --- RESIZE LOGIC ---
  if (activeCircleHandleRole === 'ellipse-rx') {
    // Dragging Horizontal Handle -> Changes Width (RadiusX)
    newRadiusX = Math.max(localOffsetX, 0.1);
    
    if (event.shiftKey) {
      // Uniform Scaling: Calculate ratio and apply to Y
      const scaleRatio = newRadiusX / initialRadiusX;
      newRadiusY = initialRadiusY * scaleRatio;
    }
  } else {
    // Dragging Vertical Handle -> Changes Height (RadiusY)
    newRadiusY = Math.max(localOffsetY, 0.1);
    
    if (event.shiftKey) {
      // Uniform Scaling: Calculate ratio and apply to X
      const scaleRatio = newRadiusY / initialRadiusY;
      newRadiusX = initialRadiusX * scaleRatio;
    }
  }

  // --- UPDATE MESH VERTICES ---
  updateGeometryVertices(
    mesh.geometry, 
    meshUnitPositionCache, 
    newRadiusX, 
    newRadiusY
  );

  // --- UPDATE OUTLINE VERTICES ---
  const outlineChild = mesh.children.find(
    (child) => child instanceof THREE.Line || child instanceof THREE.LineSegments
  ) as THREE.Line | undefined;

  if (outlineChild && outlineUnitPositionCache) {
    updateGeometryVertices(
      outlineChild.geometry, 
      outlineUnitPositionCache, 
      newRadiusX, 
      newRadiusY
    );
  }

  updateSelectionHelpers();
  refreshDimensionsForObject(mesh);
}

export function endCircleResize() {
  activeCircleHandleRole = null;
  meshUnitPositionCache = null;
  outlineUnitPositionCache = null;
  initialMouseLocal.set(0, 0); // ← NEW: Reset
}

/**
 * Helper function to write scaled positions back to the GPU buffer.
 */
function updateGeometryVertices(
  geometry: THREE.BufferGeometry, 
  unitCache: Float32Array, 
  radiusX: number, 
  radiusY: number
) {
  const positionAttribute = geometry.getAttribute('position');
  const vertexCount = positionAttribute.count;

  for (let i = 0; i < vertexCount; i++) {
    // Read normalized unit value from cache
    const unitX = unitCache[i * 3];
    const unitY = unitCache[i * 3 + 1];
    const unitZ = unitCache[i * 3 + 2];

    // Apply new dimensions: NewPos = UnitPos * NewRadius
    positionAttribute.setXYZ(i, unitX * radiusX, unitY * radiusY, unitZ);
  }

  // Flag the buffer as dirty so Three.js uploads it to the GPU
  positionAttribute.needsUpdate = true;
  
  // Recalculate bounds for correct raycasting and helpers
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}
