// src/drawing/dimensions/circleDimensions.ts
import * as THREE from 'three';
import { createDimensionLine, createDimensionLabel } from './dimensionRenderer';
import { calculateDistance, formatDistance } from './dimensionCalculator';
import { getCurrentUnitSystem } from './dimensionManager';
import { getArrowStyle } from './dimensionSettings';
import { getShapeWidthOffset, getShapeHeightOffset } from './dimensionOffset';


export function createCircleDimensions(circleMesh: THREE.Mesh) {
  
  const arrowStyle = getArrowStyle();
  const widthOffsetDistance = getShapeWidthOffset(circleMesh);
  const heightOffsetDistance = getShapeHeightOffset(circleMesh);

 
  circleMesh.geometry.computeBoundingBox();
  const boundingBox = circleMesh.geometry.boundingBox;
  
  if (!boundingBox) return;

  
  const minLocal = boundingBox.min;
  const maxLocal = boundingBox.max;

  const bottomLeftLocal = new THREE.Vector3(minLocal.x, minLocal.y, minLocal.z);
  const bottomRightLocal = new THREE.Vector3(maxLocal.x, minLocal.y, minLocal.z);
  const topLeftLocal = new THREE.Vector3(minLocal.x, maxLocal.y, minLocal.z);

  
  const bottomLeftWorld = bottomLeftLocal.clone().applyMatrix4(circleMesh.matrixWorld);
  const bottomRightWorld = bottomRightLocal.clone().applyMatrix4(circleMesh.matrixWorld);
  const topLeftWorld = topLeftLocal.clone().applyMatrix4(circleMesh.matrixWorld);

  
  const width = calculateDistance(bottomLeftWorld, bottomRightWorld);
  const height = calculateDistance(bottomLeftWorld, topLeftWorld);

  const currentUnit = getCurrentUnitSystem();
  const widthText = formatDistance(width, currentUnit);
  const heightText = formatDistance(height, currentUnit);

  
  const dimensionOffset = 1.0; 
  const extensionOverhang = 0.3; 

  

  const bottomEdgeDirection = new THREE.Vector3()
    .subVectors(bottomRightWorld, bottomLeftWorld)
    .normalize();
  
  const bottomPerpendicularDirection = new THREE.Vector3(
    bottomEdgeDirection.y,
    -bottomEdgeDirection.x,
    0
  ).normalize();

  
  const widthLineStart = bottomLeftWorld.clone().add(
    bottomPerpendicularDirection.clone().multiplyScalar(dimensionOffset + widthOffsetDistance)
  );
  const widthLineEnd = bottomRightWorld.clone().add(
    bottomPerpendicularDirection.clone().multiplyScalar(dimensionOffset + widthOffsetDistance)
  );

  
  createDimensionLine(widthLineStart, widthLineEnd, 0x703B3B, arrowStyle);

  const widthLabelPosition = new THREE.Vector3()
    .addVectors(widthLineStart, widthLineEnd)
    .multiplyScalar(0.5);

  createDimensionLabel(`Width: ${widthText}`, widthLabelPosition);

 

  const leftEdgeDirection = new THREE.Vector3()
    .subVectors(topLeftWorld, bottomLeftWorld)
    .normalize();
  
  const leftPerpendicularDirection = new THREE.Vector3(
    -leftEdgeDirection.y,
    leftEdgeDirection.x,
    0
  ).normalize();

  
  const heightLineStart = bottomLeftWorld.clone().add(
    leftPerpendicularDirection.clone().multiplyScalar(dimensionOffset + heightOffsetDistance)
  );
  const heightLineEnd = topLeftWorld.clone().add(
    leftPerpendicularDirection.clone().multiplyScalar(dimensionOffset + heightOffsetDistance)
  );

 
  createDimensionLine(heightLineStart, heightLineEnd, 0x703B3B, arrowStyle);

  const heightLabelPosition = new THREE.Vector3()
    .addVectors(heightLineStart, heightLineEnd)
    .multiplyScalar(0.5);

  createDimensionLabel(`Height: ${heightText}`, heightLabelPosition);

  // --- EXTENSION LINES aka Legs (with overhang, start from corner + offset) ---
  
  const widthExtensionStartLeft = bottomLeftWorld.clone().add(
    bottomPerpendicularDirection.clone().multiplyScalar(widthOffsetDistance)
  );
  const widthExtensionEndLeft = widthLineStart.clone().add(
    bottomPerpendicularDirection.clone().multiplyScalar(extensionOverhang)
  );
  createDimensionLine(widthExtensionStartLeft, widthExtensionEndLeft, 0xff6d1f);

  const widthExtensionStartRight = bottomRightWorld.clone().add(
    bottomPerpendicularDirection.clone().multiplyScalar(widthOffsetDistance)
  );
  const widthExtensionEndRight = widthLineEnd.clone().add(
    bottomPerpendicularDirection.clone().multiplyScalar(extensionOverhang)
  );
  createDimensionLine(widthExtensionStartRight, widthExtensionEndRight, 0xff6d1f);

  // Height extension lines - start with HEIGHT offset gap from corner
  const heightExtensionStartBottom = bottomLeftWorld.clone().add(
    leftPerpendicularDirection.clone().multiplyScalar(heightOffsetDistance)
  );
  const heightExtensionEndBottom = heightLineStart.clone().add(
    leftPerpendicularDirection.clone().multiplyScalar(extensionOverhang)
  );
  createDimensionLine(heightExtensionStartBottom, heightExtensionEndBottom, 0xff6d1f);

  const heightExtensionStartTop = topLeftWorld.clone().add(
    leftPerpendicularDirection.clone().multiplyScalar(heightOffsetDistance)
  );
  const heightExtensionEndTop = heightLineEnd.clone().add(
    leftPerpendicularDirection.clone().multiplyScalar(extensionOverhang)
  );
  createDimensionLine(heightExtensionStartTop, heightExtensionEndTop, 0xff6d1f);
}
