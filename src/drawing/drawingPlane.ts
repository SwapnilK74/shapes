// src/drawing/drawingPlane.ts
import * as THREE from 'three';
import { scene, drawPlane } from '../core/scene';
import { camera } from '../core/camera';
import { getShapeTool, isSnapEnabled } from './drawingState';
import type { ShapeTool } from './drawingState';
import { snapVectorToGrid } from './snap';
import { createPlaneMesh } from './shapes/planeShape';
import { createCircleMesh } from './shapes/circleShape';
import { createIsoscelesTriangleMesh } from './shapes/triangleShape';
import { createLineObject } from './shapes/lineShape';
import {
  beginSelectionDrag,
  updateSelectionDrag,
  endSelectionDrag
} from './dragSelection';
import { setShapeMeta } from './shapeMetadata';

import { isMeasureMode } from './measurements/measurementManager';
import { handleMeasureClick } from './measurements/measureTool';

const raycaster = new THREE.Raycaster();
const normalizedDeviceMouse = new THREE.Vector2();

/* tool name constants ------------ */

const TOOL_SELECT: ShapeTool = 'select';
const TOOL_PLANE: ShapeTool = 'plane';
const TOOL_CIRCLE: ShapeTool = 'circle';
const TOOL_TRIANGLE: ShapeTool = 'triangle';
const TOOL_LINE: ShapeTool = 'line';

let isCreatingShape = false;
const dragStartPoint = new THREE.Vector3();
let previewShape: THREE.Object3D | null = null;

/* - per-tool preview handlers ------------ */

const updatePlanePreview = (currentPointOnPlane: THREE.Vector3) => {
  const deltaX = currentPointOnPlane.x - dragStartPoint.x;
  const deltaY = currentPointOnPlane.y - dragStartPoint.y;

  const width = Math.abs(deltaX);
  const height = Math.abs(deltaY);
  if (width < 0.01 || height < 0.01) return;

  const centerX = (currentPointOnPlane.x + dragStartPoint.x) / 2;
  const centerY = (currentPointOnPlane.y + dragStartPoint.y) / 2;

  previewShape = createPlaneMesh(width, height, centerX, centerY);
  scene.add(previewShape);
};

const updateCirclePreview = (currentPointOnPlane: THREE.Vector3) => {
  const deltaX = currentPointOnPlane.x - dragStartPoint.x;
  const deltaY = currentPointOnPlane.y - dragStartPoint.y;
  const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (radius < 0.01) return;

  previewShape = createCircleMesh(radius, dragStartPoint.x, dragStartPoint.y);
  scene.add(previewShape);
};

const updateTrianglePreview = (currentPointOnPlane: THREE.Vector3) => {
  previewShape = createIsoscelesTriangleMesh(
    dragStartPoint.x,
    dragStartPoint.y,
    currentPointOnPlane.x,
    currentPointOnPlane.y
  );
  scene.add(previewShape);
};

const updateLinePreview = (currentPointOnPlane: THREE.Vector3) => {
  previewShape = createLineObject(
    dragStartPoint.x,
    dragStartPoint.y,
    currentPointOnPlane.x,
    currentPointOnPlane.y
  );
  scene.add(previewShape);
};

const shapePreviewHandlers: Partial<
  Record<Extract<ShapeTool, 'plane' | 'circle' | 'triangle' | 'line'>,
    (point: THREE.Vector3) => void>
> = {
  [TOOL_PLANE]: updatePlanePreview,
  [TOOL_CIRCLE]: updateCirclePreview,
  [TOOL_TRIANGLE]: updateTrianglePreview,
  [TOOL_LINE]: updateLinePreview
};

/* - helpers ------------ */

function projectMouseToPlane(
  event: MouseEvent,
  domElement: HTMLElement
): THREE.Vector3 | null {
  const bounds = domElement.getBoundingClientRect();

  normalizedDeviceMouse.x =
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  normalizedDeviceMouse.y =
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(normalizedDeviceMouse, camera);
  const intersections = raycaster.intersectObject(drawPlane);
  if (!intersections.length) return null;

  const worldPoint = intersections[0].point.clone();
  return isSnapEnabled() ? snapVectorToGrid(worldPoint) : worldPoint;
}

function disposeShapeObject(shape: THREE.Object3D) {
  if (shape instanceof THREE.Mesh || shape instanceof THREE.Line) {
    (shape.geometry as THREE.BufferGeometry).dispose();
    (shape.material as any).dispose?.();
  }
}

/* - pointer handlers ------------ */

function handlePointerDown(event: MouseEvent, domElement: HTMLElement) {
  
  if (isMeasureMode()) {
    return;
  }

  const activeTool = getShapeTool();

  if (activeTool === TOOL_SELECT) {
    beginSelectionDrag(event, domElement);
    return;
  }

  const startPointOnPlane = projectMouseToPlane(event, domElement);
  if (!startPointOnPlane) return;

  isCreatingShape = true;
  dragStartPoint.copy(startPointOnPlane);
}

function handlePointerMove(event: MouseEvent, domElement: HTMLElement) {
  const activeTool = getShapeTool();

  if (activeTool === TOOL_SELECT) {
    updateSelectionDrag(event, domElement);
    return;
  }

  if (!isCreatingShape) return;

  const currentPointOnPlane = projectMouseToPlane(event, domElement);
  if (!currentPointOnPlane) return;

  if (previewShape) {
    scene.remove(previewShape);
    disposeShapeObject(previewShape);
    previewShape = null;
  }

  const handler =
    shapePreviewHandlers[activeTool as keyof typeof shapePreviewHandlers];
  if (handler) {
    handler(currentPointOnPlane);
  }
}

function handlePointerUp() {
  if (isCreatingShape && previewShape) {
    const activeTool = getShapeTool();

    if (activeTool === 'plane' && previewShape instanceof THREE.Mesh) {
      const mesh = previewShape as THREE.Mesh<THREE.PlaneGeometry, THREE.Material>;
      const geom = mesh.geometry;
      const width = geom.parameters.width;
      const height = geom.parameters.height;

      const center = new THREE.Vector2(mesh.position.x, mesh.position.y);

      setShapeMeta(mesh, {
        kind: 'plane',
        center,
        width,
        height
      });
    }

    isCreatingShape = false;
    previewShape = null;
  } else {
    isCreatingShape = false;
  }

  endSelectionDrag();
}


function handleClick(event: MouseEvent, domElement: HTMLElement) {

    event.stopPropagation();
  event.preventDefault();
  // Only handle clicks in measure mode
  if (isMeasureMode()) {
     console.log(' Click handler called');
    handleMeasureClick(event, domElement);
  }
}

/* ------------ public API ------------ */

// export function attachDrawingEvents(domElement: HTMLElement) {
//   domElement.addEventListener('mousedown', (event) =>
//     handlePointerDown(event, domElement)
//   );
//   domElement.addEventListener('mousemove', (event) =>
//     handlePointerMove(event, domElement)
//   );
//   domElement.addEventListener('mouseup', () => handlePointerUp());
  
//   //  Add click event for measurement tool
//   domElement.addEventListener('click', (event) =>{
//     handleClick(event, domElement)
// }, true);
// }

// Store references to handlers
let mouseDownHandler: ((e: MouseEvent) => void) | null = null;
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let mouseUpHandler: (() => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;

export function attachDrawingEvents(domElement: HTMLElement) {

  if (mouseDownHandler) domElement.removeEventListener('mousedown', mouseDownHandler);
  if (mouseMoveHandler) domElement.removeEventListener('mousemove', mouseMoveHandler);
  if (mouseUpHandler) domElement.removeEventListener('mouseup', mouseUpHandler);
  if (clickHandler) domElement.removeEventListener('click', clickHandler);
  
  
  mouseDownHandler = (event) => handlePointerDown(event, domElement);
  mouseMoveHandler = (event) => handlePointerMove(event, domElement);
  mouseUpHandler = () => handlePointerUp();
  clickHandler = (event) => handleClick(event, domElement);
  
  
  domElement.addEventListener('mousedown', mouseDownHandler);
  domElement.addEventListener('mousemove', mouseMoveHandler);
  domElement.addEventListener('mouseup', mouseUpHandler);
  domElement.addEventListener('click', clickHandler);
}

