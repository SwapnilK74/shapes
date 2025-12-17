// src/drawing/shapes/planeShape.ts
import * as THREE from 'three';
import { useStore, hexToNumber } from '../../store';

export function createPlaneMesh(
  width: number,
  height: number,
  centerX: number,
  centerY: number
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  
  // Get default colors from store
  const { defaultFillColor, defaultOutlineColor } = useStore.getState();
  
  const material = new THREE.MeshBasicMaterial({
    color: hexToNumber(defaultFillColor),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.geometryType = 'plane';
  mesh.position.set(centerX, centerY, 0.001);

  // Outline with default outline color
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const outlinePoints = [
    new THREE.Vector3(-halfWidth, -halfHeight, 0.002),
    new THREE.Vector3(halfWidth, -halfHeight, 0.002),
    new THREE.Vector3(halfWidth, halfHeight, 0.002),
    new THREE.Vector3(-halfWidth, halfHeight, 0.002),
    new THREE.Vector3(-halfWidth, -halfHeight, 0.002)
  ];

  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMat = new THREE.LineBasicMaterial({
    color: hexToNumber(defaultOutlineColor), // USE DEFAULT OUTLINE COLOR
    linewidth: 1
  });
  (outlineMat as any).isOutlineMaterial = true;
  const outline = new THREE.LineLoop(outlineGeo, outlineMat);
  mesh.add(outline);

  return mesh;
}
