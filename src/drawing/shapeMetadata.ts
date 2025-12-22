// src/drawing/shapeMetadata.ts
import * as THREE from 'three';

export type PlaneMeta = {
  kind: 'plane';
  center: THREE.Vector2;
  width: number;
  height: number;

  corners?: {
    topLeft: THREE.Vector2;
    topRight: THREE.Vector2;
     bottomRight: THREE.Vector2;
    bottomLeft: THREE.Vector2;
  }
};

export type CircleMeta = {
  kind: 'circle';
  center: THREE.Vector2;
  radius: number;
};

export type TriangleMeta = {
  kind: 'triangle';
  apex: THREE.Vector2;
  baseHalfWidth: number;
  height: number;
};

export type LineMeta = {
  kind: 'line';
  start: THREE.Vector2;
  end: THREE.Vector2;
};

export type ShapeMeta = PlaneMeta | CircleMeta | TriangleMeta | LineMeta;

const metaById = new Map<string, ShapeMeta>();

export function setShapeMeta(object: THREE.Object3D, meta: ShapeMeta) {
  metaById.set(object.uuid, meta);
}

export function getShapeMeta(object: THREE.Object3D): ShapeMeta | undefined {
  return metaById.get(object.uuid);
}
