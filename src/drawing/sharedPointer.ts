// src/drawing/sharedPointer.ts
import * as THREE from 'three';
import { camera } from '../core/camera';
import { drawPlane } from '../core/scene';
import { isSnapEnabled } from './drawingState';
import { snapVectorToGrid } from './snap';

const raycaster = new THREE.Raycaster();
const ndcMouse = new THREE.Vector2();

export function projectMouseToPlaneForDom(
  event: MouseEvent,
  domElement: HTMLElement
): THREE.Vector3 | null {
  const bounds = domElement.getBoundingClientRect();

  ndcMouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  ndcMouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(ndcMouse, camera);
  const intersections = raycaster.intersectObject(drawPlane);
  if (!intersections.length) return null;

  const point = intersections[0].point.clone();
  return isSnapEnabled() ? snapVectorToGrid(point) : point;
}
