import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type * as THREE from 'three';

export function createControls(
  camera: THREE.Camera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.enableZoom = true;
  return controls;
}
