// src/drawing/measurements/measurementManager.ts
import * as THREE from 'three';
import { useStore } from '../../store';
import { resizeShapeLive } from './resizeFromLabel';
import type { scene } from '../../core/scene';

export type PlaneMeasureRole =
    | 'width-left-anchored'
  | 'width-right-anchored'
  | 'height-bottom-anchored'
  | 'height-top-anchored';

export interface Measurement {
  id: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  distance: number;
  dimensionOffset: number;
  labelOffset: number;
  shapeUuid?: string;
  geometryType?: 'plane' | 'circle';

  planeMeasureRole?: PlaneMeasureRole;

  dimensionLineColor: string;
  extensionLineColor: string;

  arrowColor: string;
  arrowSize: number;
  arrowStyle: 'filled' | 'open' | 'none';

  extensionOverhang: number;

  labelBackgroundColor: string;
  labelTextColor: string;
  labelFontSize: number;
  labelBackgroundOpacity: number;

  circleColor: string;
  circleSize: number;
  showCircles: boolean;
}

let measureMode = false;
let measurements: Measurement[] = [];
let activeMeasurementId: string | null = null;

/**
 * Enable/disable measurement mode
 */
export function setMeasureMode(active: boolean) {
  measureMode = active;
}

export function isMeasureMode(): boolean {
  return measureMode;
}

/**
 * Add a completed measurement
 */
export function addMeasurement(
  start: THREE.Vector3,
  end: THREE.Vector3,
  dimensionOffset: number
): Measurement {
  const distance = start.distanceTo(end);
  const defaults = useStore.getState().measurementSettings;

  const measurement: Measurement = {
    id: `measure_${Date.now()}`,
    startPoint: start.clone(),
    endPoint: end.clone(),
    distance,
    dimensionOffset,
    labelOffset: 0.5,


    dimensionLineColor: defaults.dimensionLineColor,
    extensionLineColor: defaults.extensionLineColor,

    arrowColor: defaults.arrowColor,
    arrowSize: defaults.arrowSize,
    arrowStyle: defaults.arrowStyle,

    extensionOverhang: defaults.extensionOverhang,

    labelBackgroundColor: defaults.labelBackgroundColor,
    labelTextColor: defaults.labelTextColor,
    labelFontSize: defaults.labelFontSize,
    labelBackgroundOpacity: defaults.labelBackgroundOpacity,

    circleColor: defaults.circleColor,
    circleSize: defaults.circleSize,
    showCircles: defaults.showCircles,
  };


  measurements.push(measurement);
  return measurement;
}

/**
 * Get all measurements
 */
export function getAllMeasurements(): Measurement[] {
  return measurements;
}

/**
 * Get measurement by id
 */
export function getMeasurementById(id: string): Measurement | null {
  return measurements.find((m) => m.id === id) || null;
}

/**
 * Update only the dimension offset (distance from base line)
 */
export function updateMeasurementOffset(id: string, newOffset: number) {
  const measurement = measurements.find((m) => m.id === id);
  if (measurement) {
    measurement.dimensionOffset = newOffset;
  }
}

/**
 * Update label visual settings
 */
export function updateMeasurementLabelSettings(
  id: string,
  settings: {
    labelBackgroundColor?: string;
    labelTextColor?: string;
    labelFontSize?: number;
    labelBackgroundOpacity?: number;
  }
) {
  const measurement = measurements.find((m) => m.id === id);
  if (!measurement) return;

  if (settings.labelBackgroundColor !== undefined) {
    measurement.labelBackgroundColor = settings.labelBackgroundColor;
  }
  if (settings.labelTextColor !== undefined) {
    measurement.labelTextColor = settings.labelTextColor;
  }
  if (settings.labelFontSize !== undefined) {
    measurement.labelFontSize = settings.labelFontSize;
  }
  if (settings.labelBackgroundOpacity !== undefined) {
    measurement.labelBackgroundOpacity = settings.labelBackgroundOpacity;
  }
}

/**
 * Update normalized label offset along the dimension line
 */
export function updateMeasurementLabelOffset(
  id: string,
  newLabelOffset: number
) {
  const measurement = measurements.find((m) => m.id === id);
  if (measurement) {
    // clamp between 0.1 and 0.9 to avoid labels at extreme ends
    measurement.labelOffset = Math.max(0.1, Math.min(0.9, newLabelOffset));
  }
}

/**
 * Update line/arrow colors
 */
export function updateMeasurementColors(
  id: string,
  colors: {
    dimensionLineColor?: string;
    extensionLineColor?: string;
    arrowColor?: string;
  }
) {
  const measurement = measurements.find((m) => m.id === id);
  if (!measurement) return;

  if (colors.dimensionLineColor) {
    measurement.dimensionLineColor = colors.dimensionLineColor;
  }
  if (colors.extensionLineColor) {
    measurement.extensionLineColor = colors.extensionLineColor;
  }
  if (colors.arrowColor) {
    measurement.arrowColor = colors.arrowColor;
  }
}

/**
 * Update arrow settings
 */
export function updateMeasurementArrowSettings(
  id: string,
  settings: {
    arrowSize?: number;
    arrowStyle?: 'filled' | 'open' | 'none';
  }
) {
  const measurement = measurements.find((m) => m.id === id);
  if (!measurement) return;

  if (settings.arrowSize !== undefined) {
    measurement.arrowSize = settings.arrowSize;
  }
  if (settings.arrowStyle) {
    measurement.arrowStyle = settings.arrowStyle;
  }
}

/**
 * Update extension overhang length
 */
export function updateMeasurementExtensionOverhang(
  id: string,
  overhang: number
) {
  const measurement = measurements.find((m) => m.id === id);
  if (measurement) {
    measurement.extensionOverhang = overhang;
  }
}

/**
 * Set currently active measurement id
 */
export function setActiveMeasurement(id: string | null) {
  activeMeasurementId = id;
}

/**
 * Get active measurement
 */
export function getActiveMeasurement(): Measurement | null {
  if (!activeMeasurementId) return null;
  return measurements.find((m) => m.id === activeMeasurementId) || null;
}

/**
 * Get active measurement id
 */
export function getActiveMeasurementId(): string | null {
  return activeMeasurementId;
}

/**
 * Clear all measurements
 */
export function clearAllMeasurements() {
  measurements = [];
  activeMeasurementId = null;
}

/**
 * Remove single measurement
 */
export function removeMeasurement(id: string) {
  measurements = measurements.filter((m) => m.id !== id);
  if (activeMeasurementId === id) {
    activeMeasurementId = null;
  }
}

/**
 * Update circle marker settings
 */
export function updateMeasurementCircleSettings(
  id: string,
  settings: {
    circleColor?: string;
    circleSize?: number;
    showCircles?: boolean;
  }
) {
  const measurement = measurements.find((m) => m.id === id);
  if (!measurement) return;

  if (settings.circleColor !== undefined) {
    measurement.circleColor = settings.circleColor;
  }
  if (settings.circleSize !== undefined) {
    measurement.circleSize = settings.circleSize;
  }
  if (settings.showCircles !== undefined) {
    measurement.showCircles = settings.showCircles;
  }
}

/**
 * Update measurement points (used when shapes are transformed)
 */
export function updateMeasurementPoints(
  id: string,
  newStart: THREE.Vector3,
  newEnd: THREE.Vector3
) {
  const measurement = measurements.find((m) => m.id === id);
  if (!measurement) return;

  measurement.startPoint.copy(newStart);
  measurement.endPoint.copy(newEnd);
  measurement.distance = newStart.distanceTo(newEnd);
}

/**
 * Directly set measured distance and move endPoint along current direction.
 * Used when user edits the label value (double‑click).
 */
export function updateMeasurementDistance(
  id: string,
  newDistanceMeters: number,
  scene: THREE.Scene
) {
  const measurement = measurements.find((m) => m.id === id);
  if (!measurement) return;

  const { startPoint, endPoint } = measurement;

  const dir = new THREE.Vector3().subVectors(endPoint, startPoint);
  const len = dir.length();

  if (len === 0) return;

  dir.normalize();
  const newEnd = startPoint.clone().add(dir.multiplyScalar(newDistanceMeters));

  measurement.endPoint.copy(newEnd);
  measurement.distance = newDistanceMeters;

  // if (measurement.shapeUuid && measurement.geometryType) {
  //   resizeShapeLive(measurement.shapeUuid, newDistanceMeters, measurement.geometryType, scene);
  // }
  
  if (measurement.shapeUuid && measurement.geometryType) {
  console.log('🔄 Resizing shape:', 
                measurement.shapeUuid, 
                measurement.geometryType, 
                newDistanceMeters);
  resizeShapeLive(measurement,
     newDistanceMeters, scene);
} else {
  console.log('❌ No shape link on measurement:', measurement.id, {
    shapeUuid: measurement.shapeUuid,
    geometryType: measurement.geometryType,
  });
}

}

/**
 * Get all measurement IDs
 */
export function getAllMeasurementIds(): string[] {
  return measurements.map((m) => m.id);
}

/**
 * Check if a measurement exists
 */
export function measurementExists(id: string): boolean {
  return measurements.some((m) => m.id === id);
}
