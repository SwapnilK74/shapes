// src/drawing/measurements/measurementOffset.ts
import * as THREE from 'three';

/**
 * Calculate all measurement geometry with offset applied.
 * Extension lines ALWAYS start from the original measurement points (clicks).
 * Offset moves dimension line, arrows, and label away from those points.
 * Extension lines stretch to connect original points to the offset dimension line.
 */

export interface MeasurementGeometry {
  // Extension line 1 (from first point)
  extension1Start: THREE.Vector3;
  extension1End: THREE.Vector3;
  
  // Extension line 2 (from second point)
  extension2Start: THREE.Vector3;
  extension2End: THREE.Vector3;
  
  // Dimension line (offset away from original points)
  dimensionLineStart: THREE.Vector3;
  dimensionLineEnd: THREE.Vector3;
  
  // Arrow positions (at dimension line ends)
  arrow1Position: THREE.Vector3;
  arrow1Direction: THREE.Vector3;
  arrow2Position: THREE.Vector3;
  arrow2Direction: THREE.Vector3;
  
  // Label position (center of dimension line)
  labelPosition: THREE.Vector3;
  
  // Perpendicular direction (for reference)
  perpDirection: THREE.Vector3;
}

/**
 * Determine which side of the line (point1 to point2) the click position is on.
 * Returns positive offset if click is on the "right" side, negative if on "left".
 * 
 * @param point1 - Start of measurement line
 * @param point2 - End of measurement line
 * @param clickPos - Where user clicked (point 3)
 * @returns Signed offset distance
 */
function calculateSignedOffset(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  clickPos: THREE.Vector3
): number {
  // Vector from point1 to point2
  const lineDir = new THREE.Vector3().subVectors(point2, point1);
  
  // Vector from point1 to click position
  const toClick = new THREE.Vector3().subVectors(clickPos, point1);
  
  // Project toClick onto the line to find closest point on line
  const lineLength = lineDir.length();
  const lineDirNorm = lineDir.clone().normalize();
  const projection = toClick.dot(lineDirNorm);
  const closestPointOnLine = point1.clone().add(
    lineDirNorm.clone().multiplyScalar(projection)
  );
  
  // Distance from line to click
  const offset = clickPos.distanceTo(closestPointOnLine);
  
  // Determine sign using cross product
  const cross = new THREE.Vector3().crossVectors(lineDir, toClick);
  const sign = cross.z >= 0 ? 1 : -1;
  
  return offset * sign;
}

/**
 * Calculate complete measurement geometry with offset.
 * 
 * @param point1 - First measurement point (original click position)
 * @param point2 - Second measurement point (original click position)
 * @param offset - Distance to move dimension line away from original points
 * @param overhang - How much extension lines extend PAST dimension line
 * @param offsetDirection - Optional: 1 for positive perpendicular, -1 for negative (auto-detect if not provided)
 * @returns Complete geometry for rendering
 */
export function calculateMeasurementGeometry(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  offset: number,
  overhang: number = 0.3,
  offsetDirection?: number
): MeasurementGeometry {
  
  // Step 1: Calculate the measurement direction (along the line between points)
  const measurementDirection = new THREE.Vector3()
    .subVectors(point2, point1)
    .normalize();
  
  // Step 2: Calculate perpendicular direction (which way to offset)
  const upVector = new THREE.Vector3(0, 1, 0);
  let perpDirection = new THREE.Vector3()
    .crossVectors(measurementDirection, upVector)
    .normalize();
  
  // If the cross product is zero (measurement is vertical), use X-axis
  if (perpDirection.length() < 0.001) {
    perpDirection.set(1, 0, 0);
  }
  
  // Apply direction if specified (allows negative offsets for left side)
  const direction = offsetDirection !== undefined ? offsetDirection : 1;
  const actualOffset = Math.abs(offset) * direction;
  
  // Step 3: Calculate dimension line position (offset away from original points)
  const offsetVector = perpDirection.clone().multiplyScalar(actualOffset);
  
  const dimensionLineStart = point1.clone().add(offsetVector);
  const dimensionLineEnd = point2.clone().add(offsetVector);
  
  // Step 4: Calculate extension line geometry
  // Extension lines START at original points, END at dimension line + overhang
  const overhangVector = perpDirection.clone().multiplyScalar(overhang * direction);
  
  // Extension line 1: from point1 to dimension line (with overhang past it)
  const extension1Start = point1.clone();
  const extension1End = dimensionLineStart.clone().add(overhangVector);
  
  // Extension line 2: from point2 to dimension line (with overhang past it)
  const extension2Start = point2.clone();
  const extension2End = dimensionLineEnd.clone().add(overhangVector);
  
  // Step 5: Calculate arrow positions and directions
  const arrow1Position = dimensionLineStart.clone();
  const arrow1Direction = measurementDirection.clone();
  
  const arrow2Position = dimensionLineEnd.clone();
  const arrow2Direction = measurementDirection.clone().negate();
  
  // Step 6: Calculate label position (center of dimension line)
  const labelPosition = new THREE.Vector3()
    .addVectors(dimensionLineStart, dimensionLineEnd)
    .multiplyScalar(0.5);
  
  return {
    extension1Start,
    extension1End,
    extension2Start,
    extension2End,
    dimensionLineStart,
    dimensionLineEnd,
    arrow1Position,
    arrow1Direction,
    arrow2Position,
    arrow2Direction,
    labelPosition,
    perpDirection
  };
}

/**
 * Calculate measurement geometry from 3 click points.
 * Automatically determines offset and direction from the 3rd click.
 * 
 * @param point1 - First click (start of measurement)
 * @param point2 - Second click (end of measurement)
 * @param point3 - Third click (position for dimension line)
 * @param overhang - How much extension lines extend past dimension line
 * @returns Complete geometry for rendering
 */
export function calculateMeasurementGeometryFrom3Points(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  point3: THREE.Vector3,
  overhang: number = 0.3
): MeasurementGeometry {
  
  // Calculate signed offset based on which side of the line point3 is on
  const signedOffset = calculateSignedOffset(point1, point2, point3);
  const offset = Math.abs(signedOffset);
  const direction = signedOffset >= 0 ? 1 : -1;
  
  return calculateMeasurementGeometry(point1, point2, offset, overhang, direction);
}

/**
 * Helper: Calculate just the extension line points
 */
export function calculateExtensionLinePoints(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  offset: number,
  overhang: number = 0.3,
  offsetDirection?: number
): {
  extension1Start: THREE.Vector3;
  extension1End: THREE.Vector3;
  extension2Start: THREE.Vector3;
  extension2End: THREE.Vector3;
} {
  const geometry = calculateMeasurementGeometry(point1, point2, offset, overhang, offsetDirection);
  return {
    extension1Start: geometry.extension1Start,
    extension1End: geometry.extension1End,
    extension2Start: geometry.extension2Start,
    extension2End: geometry.extension2End
  };
}

/**
 * Helper: Calculate just the dimension line position
 */
export function calculateDimensionLinePosition(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  offset: number,
  offsetDirection?: number
): {
  dimensionLineStart: THREE.Vector3;
  dimensionLineEnd: THREE.Vector3;
} {
  const geometry = calculateMeasurementGeometry(point1, point2, offset, 0.3, offsetDirection);
  return {
    dimensionLineStart: geometry.dimensionLineStart,
    dimensionLineEnd: geometry.dimensionLineEnd
  };
}

/**
 * Helper: Calculate just the label position
 */
export function calculateLabelPosition(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  offset: number,
  offsetDirection?: number
): THREE.Vector3 {
  const geometry = calculateMeasurementGeometry(point1, point2, offset, 0.3, offsetDirection);
  return geometry.labelPosition;
}

/**
 * Helper: Calculate arrow positions
 */
export function calculateArrowPositions(
  point1: THREE.Vector3,
  point2: THREE.Vector3,
  offset: number,
  offsetDirection?: number
): {
  arrow1Position: THREE.Vector3;
  arrow1Direction: THREE.Vector3;
  arrow2Position: THREE.Vector3;
  arrow2Direction: THREE.Vector3;
} {
  const geometry = calculateMeasurementGeometry(point1, point2, offset, 0.3, offsetDirection);
  return {
    arrow1Position: geometry.arrow1Position,
    arrow1Direction: geometry.arrow1Direction,
    arrow2Position: geometry.arrow2Position,
    arrow2Direction: geometry.arrow2Direction
  };
}
