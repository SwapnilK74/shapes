import * as THREE from 'three';

export const viewSize = 10;

export const sizes = {
  width: 1,
  height: 1
};

export const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
camera.position.set(0, 0, 20);
camera.lookAt(0, 0, 0);

export function updateCamera(width: number, height: number) {
  sizes.width = width;
  sizes.height = height;

  const aspect = width / height;

  camera.left = (-viewSize * aspect) / 2;
  camera.right = (viewSize * aspect) / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.updateProjectionMatrix();
}
