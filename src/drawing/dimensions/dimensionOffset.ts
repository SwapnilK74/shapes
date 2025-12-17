// src/drawing/dimensions/dimensionOffset.ts
import * as THREE from 'three';

// Default offsets
const DEFAULT_WIDTH_OFFSET = 0.5;
const DEFAULT_HEIGHT_OFFSET = 0.5;


export function getShapeWidthOffset(shape: THREE.Object3D): number {
  if (!shape.userData.dimensionSettings) {
    shape.userData.dimensionSettings = {
      widthOffset: DEFAULT_WIDTH_OFFSET,
      heightOffset: DEFAULT_HEIGHT_OFFSET
    };
  }
  return shape.userData.dimensionSettings.widthOffset ?? DEFAULT_WIDTH_OFFSET;
}


export function setShapeWidthOffset(shape: THREE.Object3D, offset: number) {
  if (!shape.userData.dimensionSettings) {
    shape.userData.dimensionSettings = {};
  }
  shape.userData.dimensionSettings.widthOffset = offset;
}


export function getShapeHeightOffset(shape: THREE.Object3D): number {
  if (!shape.userData.dimensionSettings) {
    shape.userData.dimensionSettings = {
      widthOffset: DEFAULT_WIDTH_OFFSET,
      heightOffset: DEFAULT_HEIGHT_OFFSET
    };
  }
  return shape.userData.dimensionSettings.heightOffset ?? DEFAULT_HEIGHT_OFFSET;
}


export function setShapeHeightOffset(shape: THREE.Object3D, offset: number) {
  if (!shape.userData.dimensionSettings) {
    shape.userData.dimensionSettings = {};
  }
  shape.userData.dimensionSettings.heightOffset = offset;
}


export function getDefaultWidthOffset(): number {
  return DEFAULT_WIDTH_OFFSET;
}

export function getDefaultHeightOffset(): number {
  return DEFAULT_HEIGHT_OFFSET;
}
