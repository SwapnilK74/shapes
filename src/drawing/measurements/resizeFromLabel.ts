// src/drawing/measurements/resizeFromLabel.ts
import * as THREE from 'three';
import { getShapeMeta, setShapeMeta } from '../shapeMetadata';
import type { Measurement } from './measurementManager';
import { applyPlaneSize } from '../shapes/planeShape';
import { updateMeasurementsForShape } from './trackMeasurement';

// export function resizeShapeLive(
//   shapeUuid: string,
//   newDistance: number,
//   geometryType: 'plane' | 'circle',
//   scene: THREE.Scene              
// ) {
  
//   const shape = scene.children.find(
//     (obj: THREE.Object3D) => obj.uuid === shapeUuid
//   ) as THREE.Mesh | undefined;

//   if (!shape || !shape.geometry) return;

//   const oldGeom = shape.geometry;

//   if (geometryType === 'plane') {
//     const planeGeom = oldGeom as THREE.PlaneGeometry;
//     const params = planeGeom.parameters || { width: 1, height: 1 };
//     shape.geometry = new THREE.PlaneGeometry(newDistance, params.height);
//   } else if (geometryType === 'circle') {
//     const circleGeom = oldGeom as THREE.CircleGeometry;
//     const params = circleGeom.parameters || { radius: 1, segments: 64 };
//     const radius = newDistance / 2;
//     shape.geometry = new THREE.CircleGeometry(
//       radius,
//       params.segments ?? 64
//     );
//   }

//   oldGeom.dispose();
//   shape.geometry.computeBoundingBox?.();
//   shape.geometry.computeBoundingSphere?.();
// }

export function resizeShapeLive(
  measurement: Measurement,
  newDistance: number,
  scene: THREE.Scene
) {
  if (measurement.geometryType !== 'plane' || !measurement.shapeUuid) return;

  const shape = scene.getObjectByProperty(
    'uuid',
    measurement.shapeUuid
  ) as THREE.Mesh | null;
  if (!shape) return;

  const meta = getShapeMeta(shape);
  if (!meta || meta.kind !== 'plane') return;

  const oldWidth = meta.width;
  const oldHeight = meta.height;
  const oldCenter = meta.center;

  if (measurement.planeMeasureRole === 'width-left-anchored') {
    const oldLeft = oldCenter.x - oldWidth / 2;
    const newWidth = newDistance;
    const newCenterX = oldLeft + newWidth / 2;

    meta.width = newWidth;
    meta.center = new THREE.Vector2(newCenterX, oldCenter.y);
    setShapeMeta(shape, meta);

    applyPlaneSize(shape, newWidth, oldHeight);
    shape.position.set(meta.center.x, meta.center.y, shape.position.z);

  } else if (measurement.planeMeasureRole === 'height-bottom-anchored') {
    const oldBottom = oldCenter.y - oldHeight / 2;
    const newHeight = newDistance;
    const newCenterY = oldBottom + newHeight / 2;

    meta.height = newHeight;
    meta.center = new THREE.Vector2(oldCenter.x, newCenterY);
    setShapeMeta(shape, meta);

    applyPlaneSize(shape, oldWidth, newHeight);
  } else{
    return;
  }
    shape.position.set(meta.center.x, meta.center.y, shape.position.z);

    updateMeasurementsForShape(shape.uuid);
    
}

