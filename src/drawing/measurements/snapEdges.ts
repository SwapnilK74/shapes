// src/drawing/measurements/snapEdges.ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { SnapPoint } from './snapDetection';
import { getMeasurementSettings } from './measurementSettings';

/**
 * World‑space edge segment belonging to a shape.
 */
export interface SnapEdge {
  start: THREE.Vector3;        
  end: THREE.Vector3;          
  shapeId: number;
  shapeName?: string;
}

/**
 * Collect all snap edges from all supported shapes in the scene.
 */
export function collectAllSnapEdges(scene: THREE.Scene, includeGuides: boolean = false): SnapEdge[] {
  const snapEdges: SnapEdge[] = [];

  scene.traverse(object3D => {
    if (!(object3D instanceof THREE.Mesh)) return;

    const geometryType = object3D.userData.geometryType;

    if (geometryType === 'plane') {
      const planeEdges = getPlaneEdges(object3D);
      snapEdges.push(...planeEdges);
      
      if (includeGuides) {
        const guideLines = getPlaneGuideLines(object3D);
        snapEdges.push(...guideLines);
      }
    } else if (geometryType === 'circle') {
      const circleEdges = getCircleEdges(object3D);
      snapEdges.push(...circleEdges);
      
      // ALWAYS show circle guide lines (ignore includeGuides parameter)
      const guideLines = getCircleGuideLines(object3D);
      snapEdges.push(...guideLines);
    }
    // TODO: add triangle
  });

  return snapEdges;
}

/**
 * Get all 4 edges of a plane as world‑space segments.
 */
export function getPlaneEdges(mesh: THREE.Mesh): SnapEdge[] {
  const edges: SnapEdge[] = [];

  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox!;
  
  // 4 corners in local space
  const cornersLocal: THREE.Vector3[] = [
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, 0),
    new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, 0),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, 0),
    new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, 0),
  ];

  // Convert corners to world space
  const cornersWorld = cornersLocal.map(cornerLocal =>
    cornerLocal.clone().applyMatrix4(mesh.matrixWorld)
  );

  // 4 edges
  for (let cornerIndex = 0; cornerIndex < 4; cornerIndex++) {
    const nextIndex = (cornerIndex + 1) % 4;

    edges.push({
      start: cornersWorld[cornerIndex].clone(),
      end: cornersWorld[nextIndex].clone(),
      shapeId: mesh.id,
      shapeName: 'plane'
    });
  }

  return edges;
}

/**
 * Get circle edges as 2 diameter lines (horizontal and vertical).
 * This provides clean snap targets along the major axes.
 */
export function getCircleEdges(mesh: THREE.Mesh): SnapEdge[] {
  const edges: SnapEdge[] = [];

  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  const radiusX = (bbox.max.x - bbox.min.x) / 2;
  const radiusY = (bbox.max.y - bbox.min.y) / 2;

  // Cardinal points in local space
  const rightLocal = new THREE.Vector3(radiusX, 0, 0);
  const topLocal = new THREE.Vector3(0, radiusY, 0);
  const leftLocal = new THREE.Vector3(-radiusX, 0, 0);
  const bottomLocal = new THREE.Vector3(0, -radiusY, 0);

  // Transform to world space
  const rightWorld = rightLocal.clone().applyMatrix4(mesh.matrixWorld);
  const topWorld = topLocal.clone().applyMatrix4(mesh.matrixWorld);
  const leftWorld = leftLocal.clone().applyMatrix4(mesh.matrixWorld);
  const bottomWorld = bottomLocal.clone().applyMatrix4(mesh.matrixWorld);

  // Horizontal diameter (left to right)
  edges.push({
    start: leftWorld.clone(),
    end: rightWorld.clone(),
    shapeId: mesh.id,
    shapeName: 'circle'
  });

  // Vertical diameter (bottom to top)
  edges.push({
    start: bottomWorld.clone(),
    end: topWorld.clone(),
    shapeId: mesh.id,
    shapeName: 'circle'
  });

  return edges;
}

/**
 * Get diagonal and center guide lines for a plane
 */
export function getPlaneGuideLines(mesh: THREE.Mesh): SnapEdge[] {
  const guideLines: SnapEdge[] = [];

  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox!;
  
  const cornersLocal: THREE.Vector3[] = [
    new THREE.Vector3(boundingBox.min.x, boundingBox.min.y, 0),
    new THREE.Vector3(boundingBox.max.x, boundingBox.min.y, 0),
    new THREE.Vector3(boundingBox.max.x, boundingBox.max.y, 0),
    new THREE.Vector3(boundingBox.min.x, boundingBox.max.y, 0),
  ];

  const cornersWorld = cornersLocal.map(cornerLocal =>
    cornerLocal.clone().applyMatrix4(mesh.matrixWorld)
  );

  const corner0 = cornersWorld[0];
  const corner1 = cornersWorld[1];
  const corner2 = cornersWorld[2];
  const corner3 = cornersWorld[3];

  // Calculate edge midpoints for center lines
  const midpoint01 = new THREE.Vector3().lerpVectors(corner0, corner1, 0.5);
  const midpoint12 = new THREE.Vector3().lerpVectors(corner1, corner2, 0.5);
  const midpoint23 = new THREE.Vector3().lerpVectors(corner2, corner3, 0.5);
  const midpoint30 = new THREE.Vector3().lerpVectors(corner3, corner0, 0.5);

  // Diagonal lines
  guideLines.push({
    start: corner0.clone(),
    end: corner2.clone(),
    shapeId: mesh.id,
    shapeName: 'plane-diagonal'
  });

  guideLines.push({
    start: corner1.clone(),
    end: corner3.clone(),
    shapeId: mesh.id,
    shapeName: 'plane-diagonal'
  });

  // Center cross lines
  guideLines.push({
    start: midpoint01.clone(),
    end: midpoint23.clone(),
    shapeId: mesh.id,
    shapeName: 'plane-center'
  });

  guideLines.push({
    start: midpoint12.clone(),
    end: midpoint30.clone(),
    shapeId: mesh.id,
    shapeName: 'plane-center'
  });

  return guideLines;
}

/**
 * Get circle guide lines (cross through center at cardinal points)
 */
export function getCircleGuideLines(mesh: THREE.Mesh): SnapEdge[] {
  const guideLines: SnapEdge[] = [];

  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  const radiusX = (bbox.max.x - bbox.min.x) / 2;
  const radiusY = (bbox.max.y - bbox.min.y) / 2;

  // Cardinal points in local space
  const rightLocal = new THREE.Vector3(radiusX, 0, 0);
  const topLocal = new THREE.Vector3(0, radiusY, 0);
  const leftLocal = new THREE.Vector3(-radiusX, 0, 0);
  const bottomLocal = new THREE.Vector3(0, -radiusY, 0);

  // Transform to world space
  const rightWorld = rightLocal.clone().applyMatrix4(mesh.matrixWorld);
  const topWorld = topLocal.clone().applyMatrix4(mesh.matrixWorld);
  const leftWorld = leftLocal.clone().applyMatrix4(mesh.matrixWorld);
  const bottomWorld = bottomLocal.clone().applyMatrix4(mesh.matrixWorld);

  // Horizontal diameter (left to right)
  guideLines.push({
    start: leftWorld.clone(),
    end: rightWorld.clone(),
    shapeId: mesh.id,
    shapeName: 'circle-diameter'
  });

  // Vertical diameter (bottom to top)
  guideLines.push({
    start: bottomWorld.clone(),
    end: topWorld.clone(),
    shapeId: mesh.id,
    shapeName: 'circle-diameter'
  });

  return guideLines;
}

/**
 * Closest point on a line segment AB to point Point.
 */
export function closestPointOnSegment(
  point: THREE.Vector3,
  segmentStart: THREE.Vector3,
  segmentEnd: THREE.Vector3
): THREE.Vector3 {
  const segmentVector = segmentEnd.clone().sub(segmentStart);
  const pointVector = point.clone().sub(segmentStart);
  const segmentLengthSquared = segmentVector.lengthSq();

  if (segmentLengthSquared === 0) {
    return segmentStart.clone();
  }

  const projectionFactor = pointVector.dot(segmentVector) / segmentLengthSquared;
  const clampedFactor = Math.max(0, Math.min(1, projectionFactor));

  return segmentStart.clone().add(segmentVector.multiplyScalar(clampedFactor));
}

/**
 * Find nearest edge snap candidate to worldPosition.
 */
export function findNearestEdgeSnap(
  worldPosition: THREE.Vector3,
  edges: SnapEdge[],
  snapThreshold: number = 0.5
): SnapPoint | null {
  let bestSnapPoint: SnapPoint | null = null;
  let bestDistance = snapThreshold;

  for (const edge of edges) {
    const closestPoint = closestPointOnSegment(worldPosition, edge.start, edge.end);
    const distanceToEdge = worldPosition.distanceTo(closestPoint);

    if (distanceToEdge < bestDistance) {
      bestDistance = distanceToEdge;

      bestSnapPoint = {
        position: closestPoint,
        type: 'edge',
        shapeId: edge.shapeId,
        shapeName: edge.shapeName
      };
    }
  }

  return bestSnapPoint;
}

/**
 * Build a Line2 for highlighting an edge.
 */
export function createEdgeHighlightLine(edge: SnapEdge): Line2 {
  const settings = getMeasurementSettings();

  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions([
    edge.start.x, edge.start.y, edge.start.z,
    edge.end.x, edge.end.y, edge.end.z
  ]);

  const lineMaterial = new LineMaterial({
    color: settings.dimensionLineColor,
    linewidth: 3,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    worldUnits: false
  });

  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();
  (line as any).isEdgeIndicator = true;
  line.renderOrder = 997;

  return line;
}

/**
 * Create visible guide lines for a plane
 */
export function createPlaneGuideLineVisuals(mesh: THREE.Mesh): THREE.Group {
  const guideGroup = new THREE.Group();
  guideGroup.name = 'planeGuideLines';
  (guideGroup as any).isGuideLineGroup = true;

  const guideLines = getPlaneGuideLines(mesh);

  guideLines.forEach(guideLine => {
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([
      guideLine.start.x, guideLine.start.y, guideLine.start.z,
      guideLine.end.x, guideLine.end.y, guideLine.end.z
    ]);

    const lineMaterial = new LineMaterial({
      color: 0xFFBF78,
      linewidth: 1.5,
      opacity: 0.4,
      transparent: true,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      worldUnits: false,
      depthTest: true,
      depthWrite: false
    });

    const line = new Line2(lineGeometry, lineMaterial);
    line.computeLineDistances();
    line.renderOrder = 996;
    
    guideGroup.add(line);
  });

  return guideGroup;
}

/**
 * Create visible guide lines for a circle (cross through center)
 */
export function createCircleGuideLineVisuals(mesh: THREE.Mesh): THREE.Group {
  const guideGroup = new THREE.Group();
  guideGroup.name = 'circleGuideLines';
  (guideGroup as any).isGuideLineGroup = true;

  const guideLines = getCircleGuideLines(mesh);

  guideLines.forEach(guideLine => {
    const lineGeometry = new LineGeometry();
    lineGeometry.setPositions([
      guideLine.start.x, guideLine.start.y, guideLine.start.z,
      guideLine.end.x, guideLine.end.y, guideLine.end.z
    ]);

    const lineMaterial = new LineMaterial({
      color: 0xFFBF78,
      linewidth: 1.5,
      opacity: 0.4,
      transparent: true,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      worldUnits: false,
      depthTest: true,
      depthWrite: false
    });

    const line = new Line2(lineGeometry, lineMaterial);
    line.computeLineDistances();
    line.renderOrder = 996;
    
    guideGroup.add(line);
  });

  return guideGroup;
}
