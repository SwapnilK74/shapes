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

  const { defaultFillColor, defaultOutlineColor } = useStore.getState();

  const material = new THREE.MeshBasicMaterial({
    color: hexToNumber(defaultFillColor),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.geometryType = 'plane';
  mesh.position.set(centerX, centerY, 0.001);

  const outline = createPlaneOutline(width, height, defaultOutlineColor);
  mesh.add(outline);

  return mesh;
}

// ✅ new helper: create outline only
function createPlaneOutline(
  width: number,
  height: number,
  colorHex: string
): THREE.LineLoop {
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
    color: hexToNumber(colorHex),
    linewidth: 1
  });
  (outlineMat as any).isOutlineMaterial = true;

  return new THREE.LineLoop(outlineGeo, outlineMat);
}

// ✅ new helper: update existing mesh + outline to a new width/height
export function applyPlaneSize(
  mesh: THREE.Mesh,
  width: number,
  height: number
) {
  // update fill
  const oldGeom = mesh.geometry as THREE.PlaneGeometry;
  oldGeom.dispose();
  mesh.geometry = new THREE.PlaneGeometry(width, height);

  // update outline child (assume first Line/LineLoop child is outline)
  const outline = mesh.children.find(
    c => c instanceof THREE.Line || c instanceof THREE.LineLoop
  ) as THREE.Line | undefined;

  if (outline) {
    outline.geometry.dispose();

    const { defaultOutlineColor } = useStore.getState();
    const newOutline = createPlaneOutline(width, height, defaultOutlineColor);

    // re-use existing outline material to keep selection styling etc
    const existingMat = outline.material;
    outline.geometry = newOutline.geometry;
    outline.material = existingMat;
  }

  mesh.geometry.computeBoundingBox?.();
  mesh.geometry.computeBoundingSphere?.();
}
