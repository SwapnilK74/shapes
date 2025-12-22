// src/drawing/measurements/trackMeasurement.ts
import * as THREE from 'three';
import { getMeasurementById, updateMeasurementPoints, removeMeasurement } from './measurementManager';
import { updateMeasurementPositions, removeMeasurementVisuals } from './measurementRenderer';
import { scene } from '../../core/scene';


/**
 * Attachment info for a measurement point
 */
interface PointAttachment {
  shapeId: string;
  localPoint: THREE.Vector3; // Position relative to shape's origin
  localNormalized: THREE.Vector2; // ✅ NEW: Normalized coordinates (0-1 range)
}


/**
 * Extended measurement tracking data
 */
interface MeasurementTracking {
  measurementId: string;
  startAttachment?: PointAttachment;
  endAttachment?: PointAttachment;
}


// Store all measurement tracking data
const measurementTrackingMap = new Map<string, MeasurementTracking>();


// Store shape-to-measurements lookup for efficient updates
const shapeToMeasurementsMap = new Map<string, Set<string>>();


/**
 * Remove all measurements attached to a given shape UUID
 */
export function removeMeasurementsForShape(shapeUuid: string) {
  const measurementIds = shapeToMeasurementsMap.get(shapeUuid);
  if (!measurementIds) return;

  // Copy to array because we'll mutate maps inside
  const idsToRemove = Array.from(measurementIds);

  for (const measurementId of idsToRemove) {
    // Clean tracking
    detachMeasurement(measurementId);

    // Remove from data model
    removeMeasurement(measurementId);

    // Remove visuals
    removeMeasurementVisuals(measurementId);
  }
}


/**
 * Attach a measurement to shape(s)
 */
export function attachMeasurementToShapes(
  measurementId: string,
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  startShapeId?: string,
  endShapeId?: string
) {
  const tracking: MeasurementTracking = {
    measurementId,
  };

  // Attach start point
  if (startShapeId) {
    const shape = getShapeById(startShapeId);
    if (shape instanceof THREE.Mesh) {
      const localStart = worldToLocal(startPoint, shape);
      const normalized = getNormalizedCoordinates(localStart, shape);
      
      tracking.startAttachment = {
        shapeId: startShapeId,
        localPoint: localStart,
        localNormalized: normalized,
      };
      
      // Add to shape lookup
      if (!shapeToMeasurementsMap.has(startShapeId)) {
        shapeToMeasurementsMap.set(startShapeId, new Set());
      }
      shapeToMeasurementsMap.get(startShapeId)!.add(measurementId);
    }
  }

  // Attach end point
  if (endShapeId) {
    const shape = getShapeById(endShapeId);
    if (shape instanceof THREE.Mesh) {
      const localEnd = worldToLocal(endPoint, shape);
      const normalized = getNormalizedCoordinates(localEnd, shape);
      
      tracking.endAttachment = {
        shapeId: endShapeId,
        localPoint: localEnd,
        localNormalized: normalized,
      };
      
      // Add to shape lookup
      if (!shapeToMeasurementsMap.has(endShapeId)) {
        shapeToMeasurementsMap.set(endShapeId, new Set());
      }
      shapeToMeasurementsMap.get(endShapeId)!.add(measurementId);
    }
  }

  measurementTrackingMap.set(measurementId, tracking);
}



/**
 * Update measurements when a shape is transformed
 */
export function updateMeasurementsForShape(shapeId: string) {
  const measurementIds = shapeToMeasurementsMap.get(shapeId);
  if (!measurementIds) return;

  const shape = getShapeById(shapeId);
  if (!shape || !(shape instanceof THREE.Mesh)) return;

  measurementIds.forEach((measurementId) => {
    const tracking = measurementTrackingMap.get(measurementId);
    if (!tracking) return;

    const measurement = getMeasurementById(measurementId);
    if (!measurement) return;

    let newStartPoint = measurement.startPoint.clone();
    let newEndPoint = measurement.endPoint.clone();
    let updated = false;

    // Update start point if attached to this shape
    if (tracking.startAttachment?.shapeId === shapeId) {
      // ✅ Use normalized coordinates to handle resize
      newStartPoint = normalizedToWorld(tracking.startAttachment.localNormalized, shape);
      updated = true;
    }

    // Update end point if attached to this shape
    if (tracking.endAttachment?.shapeId === shapeId) {
      // ✅ Use normalized coordinates to handle resize
      newEndPoint = normalizedToWorld(tracking.endAttachment.localNormalized, shape);
      updated = true;
    }

          console.log(
  'updateMeasurementsForShape shape',
  shapeId,
  'measurements',
  Array.from(measurementIds)
);

    if (updated) {
      // Update measurement data
      updateMeasurementPoints(measurementId, newStartPoint, newEndPoint);
      
      // Update visuals
      updateMeasurementPositions(measurementId, measurement);
      
      


    }
  });
}



/**
 * Detach measurement from shape(s)
 */
export function detachMeasurement(measurementId: string) {
  const tracking = measurementTrackingMap.get(measurementId);
  if (!tracking) return;

  // Remove from shape lookups
  if (tracking.startAttachment) {
    const measurements = shapeToMeasurementsMap.get(tracking.startAttachment.shapeId);
    if (measurements) {
      measurements.delete(measurementId);
    }
  }

  if (tracking.endAttachment) {
    const measurements = shapeToMeasurementsMap.get(tracking.endAttachment.shapeId);
    if (measurements) {
      measurements.delete(measurementId);
    }
  }

  measurementTrackingMap.delete(measurementId);
}



/**
 * Get measurement attachment info
 */
export function getMeasurementTracking(measurementId: string): MeasurementTracking | undefined {
  return measurementTrackingMap.get(measurementId);
}



/**
 * Check if measurement is attached to any shape
 */
export function isMeasurementAttached(measurementId: string): boolean {
  const tracking = measurementTrackingMap.get(measurementId);
  return !!(tracking?.startAttachment || tracking?.endAttachment);
}



/**
 * Get measurement type based on attachments
 */
export function getMeasurementType(measurementId: string): 'single-shape' | 'cross-shape' | 'free' {
  const tracking = measurementTrackingMap.get(measurementId);
  if (!tracking) return 'free';

  const hasStart = !!tracking.startAttachment;
  const hasEnd = !!tracking.endAttachment;

  if (!hasStart && !hasEnd) return 'free';
  
  if (hasStart && hasEnd) {
    return tracking.startAttachment!.shapeId === tracking.endAttachment!.shapeId
      ? 'single-shape'
      : 'cross-shape';
  }

  return 'single-shape'; // One point attached
}



// ✅ NEW: Helper functions for normalized coordinates

/**
 * Get normalized coordinates (0-1 range) from local point
 * This handles resize properly
 */
function getNormalizedCoordinates(localPoint: THREE.Vector3, mesh: THREE.Mesh): THREE.Vector2 {
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  const width = bbox.max.x - bbox.min.x;
  const height = bbox.max.y - bbox.min.y;
  
  // Normalize to 0-1 range
  const normalizedX = width > 0 ? (localPoint.x - bbox.min.x) / width : 0.5;
  const normalizedY = height > 0 ? (localPoint.y - bbox.min.y) / height : 0.5;
  
  return new THREE.Vector2(normalizedX, normalizedY);
}


/**
 * Convert normalized coordinates back to world position
 * This handles resize, rotation, and translation
 */
function normalizedToWorld(normalized: THREE.Vector2, mesh: THREE.Mesh): THREE.Vector3 {
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  const width = bbox.max.x - bbox.min.x;
  const height = bbox.max.y - bbox.min.y;
  
  // Convert from normalized (0-1) back to local coordinates
  const localX = bbox.min.x + normalized.x * width;
  const localY = bbox.min.y + normalized.y * height;
  
  const localPoint = new THREE.Vector3(localX, localY, 0);
  
  // Transform to world space (handles rotation and translation)
  const worldPoint = localPoint.clone();
  mesh.localToWorld(worldPoint);
  
  return worldPoint;
}


// Original helper functions (kept for reference, but not used anymore)

function getShapeById(shapeId: string): THREE.Object3D | null {
  return scene.getObjectByProperty('uuid', shapeId) || null;
}


function worldToLocal(worldPoint: THREE.Vector3, shape: THREE.Object3D): THREE.Vector3 {
  const localPoint = worldPoint.clone();
  shape.worldToLocal(localPoint);
  return localPoint;
}


// function localToWorld(localPoint: THREE.Vector3, shape: THREE.Object3D): THREE.Vector3 {
//   const worldPoint = localPoint.clone();
//   shape.localToWorld(worldPoint);
//   return worldPoint;
// }



/**
 * Clean up all tracking data
 */
export function clearAllMeasurementTracking() {
  measurementTrackingMap.clear();
  shapeToMeasurementsMap.clear();
}
