import * as THREE from 'three';

export const canvas = document.createElement('canvas');

export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});

export function setRendererSize(width: number, height: number) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
}
