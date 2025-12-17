// outlineSelection.ts
import * as THREE from 'three';
import { getSelectedObject } from './selection';

export function setSelectedOutlineColor(hex: string) {
  const selected = getSelectedObject();
  if (!selected) return;

  selected.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const mat = mesh.material;
    if (!mat || Array.isArray(mat)) return;
    if (!(mat as any).isOutlineMaterial) return;

    (mat as THREE.LineBasicMaterial).color.set(hex);
    mat.needsUpdate = true;
  });
}
