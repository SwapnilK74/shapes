// src/drawing/shapes/circleShape.ts
import * as THREE from 'three';
import { useStore, hexToNumber } from '../../store';

export function createCircleMesh(
  radius: number,
  centerX: number,
  centerY: number
): THREE.Mesh {
  const segments = 64;
  const geometry = new THREE.CircleGeometry(radius, segments);
  
  // Get default colors from store
  const { defaultFillColor, defaultOutlineColor } = useStore.getState();
  
  const material = new THREE.MeshBasicMaterial({
    color: hexToNumber(defaultFillColor),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.geometryType = 'circle';
  mesh.position.set(centerX, centerY, 0.001);

  const outlinePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    outlinePoints.push(
      new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0.002)
    );
  }
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMat = new THREE.LineBasicMaterial({ 
    color: hexToNumber(defaultOutlineColor) 
  });
  (outlineMat as any).isOutlineMaterial = true;
  const outline = new THREE.LineLoop(outlineGeo, outlineMat);
  mesh.add(outline);

  return mesh;
}
