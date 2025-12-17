import * as THREE from 'three';

export interface SnapPoint {
  position: THREE.Vector3;
  type: 'vertex' | 'midpoint' | 'center' | 'edge'; 
  shapeId: number;
  shapeName?: string;
}

/**
 * Get all snap points for a plane mesh
 */
export function getPlaneSnapPoints(mesh: THREE.Mesh): SnapPoint[] {
  const snapPoints: SnapPoint[] = [];
  
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  // 4 corners in local space
  const cornersLocal = [
    new THREE.Vector3(bbox.min.x, bbox.min.y, 0),
    new THREE.Vector3(bbox.max.x, bbox.min.y, 0),
    new THREE.Vector3(bbox.max.x, bbox.max.y, 0),
    new THREE.Vector3(bbox.min.x, bbox.max.y, 0),
  ];
  
  // Convert to world space
  const cornersWorld = cornersLocal.map(corner => 
    corner.clone().applyMatrix4(mesh.matrixWorld)
  );
  
  // Add vertices
  cornersWorld.forEach(corner => {
    snapPoints.push({
      position: corner,
      type: 'vertex',
      shapeId: mesh.id,
      shapeName: 'plane'
    });
  });
  
  // Add edge midpoints
  for (let i = 0; i < 4; i++) {
    const nextIndex = (i + 1) % 4;
    const midpoint = new THREE.Vector3()
      .lerpVectors(cornersWorld[i], cornersWorld[nextIndex], 0.5);
    
    snapPoints.push({
      position: midpoint,
      type: 'midpoint',
      shapeId: mesh.id,
      shapeName: 'plane'
    });
  }
  
  // Add center
  snapPoints.push({
    position: mesh.position.clone(),
    type: 'center',
    shapeId: mesh.id,
    shapeName: 'plane'
  });
  
  return snapPoints;
}

/**
 * Get all snap points for a circle/ellipse mesh
 * Simplified: Only 4 cardinal points + center
 */
export function getCircleSnapPoints(mesh: THREE.Mesh): SnapPoint[] {
  const snapPoints: SnapPoint[] = [];
  
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  // Calculate radii from bounding box
  const radiusX = (bbox.max.x - bbox.min.x) / 2;
  const radiusY = (bbox.max.y - bbox.min.y) / 2;
  
  // Cardinal points in local space (Right, Top, Left, Bottom)
  const cardinalPointsLocal = [
    new THREE.Vector3(radiusX, 0, 0),      // Right (3 o'clock)
    new THREE.Vector3(0, radiusY, 0),      // Top (12 o'clock)
    new THREE.Vector3(-radiusX, 0, 0),     // Left (9 o'clock)
    new THREE.Vector3(0, -radiusY, 0),     // Bottom (6 o'clock)
  ];
  
  // Convert to world space (applies rotation)
  const cardinalPointsWorld = cardinalPointsLocal.map(point => 
    point.clone().applyMatrix4(mesh.matrixWorld)
  );
  
  // Add cardinal points as vertices
  cardinalPointsWorld.forEach(point => {
    snapPoints.push({
      position: point,
      type: 'vertex',
      shapeId: mesh.id,
      shapeName: 'circle'
    });
  });
  
  // Add center
  snapPoints.push({
    position: mesh.position.clone(),
    type: 'center',
    shapeId: mesh.id,
    shapeName: 'circle'
  });
  
  return snapPoints;
}

/**
 * Get all snap points for a triangle mesh
 */
export function getTriangleSnapPoints(mesh: THREE.Mesh): SnapPoint[] {
  const snapPoints: SnapPoint[] = [];
  
  const positionAttribute = mesh.geometry.getAttribute('position');
  if (!positionAttribute || positionAttribute.count !== 3) return snapPoints;
  
  // Get 3 vertices in local space
  const verticesLocal = [
    new THREE.Vector3(
      positionAttribute.getX(0),
      positionAttribute.getY(0),
      positionAttribute.getZ(0)
    ),
    new THREE.Vector3(
      positionAttribute.getX(1),
      positionAttribute.getY(1),
      positionAttribute.getZ(1)
    ),
    new THREE.Vector3(
      positionAttribute.getX(2),
      positionAttribute.getY(2),
      positionAttribute.getZ(2)
    ),
  ];
  
  // Convert to world space
  const verticesWorld = verticesLocal.map(vertex => 
    vertex.clone().applyMatrix4(mesh.matrixWorld)
  );
  
  // Add vertices
  verticesWorld.forEach(vertex => {
    snapPoints.push({
      position: vertex,
      type: 'vertex',
      shapeId: mesh.id,
      shapeName: 'triangle'
    });
  });
  
  // Add edge midpoints
  for (let i = 0; i < 3; i++) {
    const nextIndex = (i + 1) % 3;
    const midpoint = new THREE.Vector3()
      .lerpVectors(verticesWorld[i], verticesWorld[nextIndex], 0.5);
    
    snapPoints.push({
      position: midpoint,
      type: 'midpoint',
      shapeId: mesh.id,
      shapeName: 'triangle'
    });
  }
  
  // Add center (centroid)
  snapPoints.push({
    position: mesh.position.clone(),
    type: 'center',
    shapeId: mesh.id,
    shapeName: 'triangle'
  });
  
  return snapPoints;
}

/**
 * Find the nearest snap point to a given world position
 */
export function findNearestSnapPoint(
  worldPosition: THREE.Vector3,
  allSnapPoints: SnapPoint[]
): SnapPoint | null {
  const snapThreshold = 0.5;
  
  let nearestSnap: SnapPoint | null = null;
  let minDistance = snapThreshold;
  
  allSnapPoints.forEach(snap => {
    const distance = worldPosition.distanceTo(snap.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestSnap = snap;
    }
  });
  
  return nearestSnap;
}

/**
 * Collect all snap points from all shapes in the scene
 */
export function collectAllSnapPoints(scene: THREE.Scene): SnapPoint[] {
  const allSnaps: SnapPoint[] = [];
  
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    
    const geometryType = object.userData.geometryType;
    
    if (geometryType === 'plane') {
      const planeSnaps = getPlaneSnapPoints(object);
      allSnaps.push(...planeSnaps);
    } else if (geometryType === 'circle') {
      const circleSnaps = getCircleSnapPoints(object);
      allSnaps.push(...circleSnaps);
    } else if (geometryType === 'triangle') {
      const triangleSnaps = getTriangleSnapPoints(object);
      allSnaps.push(...triangleSnaps);
    }
    // Lines would be handled separately if needed
  });
  
  return allSnaps;
}
