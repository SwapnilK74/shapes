import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// grid in XY plane (UI-only helper)
export const grid = new THREE.GridHelper(20, 20);
grid.rotation.x = Math.PI / 2;
grid.name = 'gridHelper';
(grid as any).isUiOnly = true; // custom flag to skip interactions
scene.add(grid);

// invisible drawing plane in XY
const basePlaneGeom = new THREE.PlaneGeometry(20, 20);
const basePlaneMat = new THREE.MeshBasicMaterial({
  color: 0x222244,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.2
});
export const drawPlane = new THREE.Mesh(basePlaneGeom, basePlaneMat);
drawPlane.visible = false;
drawPlane.name = 'drawPlane';
scene.add(drawPlane);
