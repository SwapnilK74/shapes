import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// grid in XY plane (UI-only helper)
export const grid = new THREE.GridHelper(40, 40);
grid.rotation.x = Math.PI / 2;
grid.name = 'gridHelper';
(grid as any).isUiOnly = true; // custom flag to skip interactions
scene.add(grid);

// invisible drawing plane in XY
const basePlaneGeom = new THREE.PlaneGeometry(40, 40);
const basePlaneMat = new THREE.MeshBasicMaterial({
  color: 0x222244,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.1
});
export const drawPlane = new THREE.Mesh(basePlaneGeom, basePlaneMat);
drawPlane.visible = false;
drawPlane.name = 'drawPlane';
scene.add(drawPlane);

export function getDrawingBounds() {
  const width = (drawPlane.geometry as THREE.PlaneGeometry).parameters.width;
  const height = (drawPlane.geometry as THREE.PlaneGeometry).parameters.height;
  return { width, height};
}
