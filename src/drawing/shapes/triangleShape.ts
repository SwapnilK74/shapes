// src/drawing/shapes/triangleShape.ts
import * as THREE from 'three';

export function createIsoscelesTriangleMesh(
  apexX: number,
  apexY: number,
  dragX: number,
  dragY: number
): THREE.Mesh {
  const halfBase = Math.abs(dragX - apexX);
  const height = dragY - apexY;

  const apex = new THREE.Vector3(apexX, apexY, 0.001);
  const baseLeft = new THREE.Vector3(apexX - halfBase, apexY + height, 0.001);
  const baseRight = new THREE.Vector3(apexX + halfBase, apexY + height, 0.001);

  const geom = new THREE.BufferGeometry().setFromPoints([apex, baseLeft, baseRight]);
  geom.setIndex([0, 1, 2]);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.geometryType = 'triangle';

  const outlineGeo = new THREE.BufferGeometry().setFromPoints([
    apex.clone().setZ(0.002),
    baseLeft.clone().setZ(0.002),
    baseRight.clone().setZ(0.002)
  ]);
  
const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
(outlineMat as any).isOutlineMaterial = true;  
const outline = new THREE.LineLoop(outlineGeo, outlineMat);
mesh.add(outline);

  return mesh;
}
