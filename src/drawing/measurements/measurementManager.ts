// src/drawing/measurements/measurementManager.ts
import * as THREE from 'three';
import { useStore } from '../../store';

export interface Measurement {
  id: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  distance: number;
  dimensionOffset: number; 
  labelOffset: number; 

  dimensionLineColor: string;
  extensionLineColor: string;
  
  arrowColor: string;
  arrowSize: number;
  arrowStyle: 'filled' | 'open' | 'none';
  
  extensionOverhang: number;

  labelBackgroundColor: string,
  labelTextColor: string,
  labelFontSize: number,
  labelBackgroundOpacity: number,

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
  const  defaults = useStore.getState().measurementSettings;
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
    
    extensionOverhang:defaults.extensionOverhang,

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


export function getMeasurementById(id: string): Measurement | null {
  return measurements.find((m) => m.id === id) || null;
}


export function updateMeasurementOffset(id: string, newOffset: number) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
    measurement.dimensionOffset = newOffset;
  }
}


export function updateMeasurementLabelSettings(id: string, settings: {
  labelBackgroundColor?: string;
  labelTextColor?: string;
  labelFontSize?: number;
  labelBackgroundOpacity?: number;
}) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
    if (settings.labelBackgroundColor !== undefined) {
      measurement.labelBackgroundColor = settings.labelBackgroundColor;
    }
    if (settings.labelTextColor !== undefined) {
      measurement.labelTextColor = settings.labelTextColor;
    }
    if (settings.labelFontSize !== undefined) {
      measurement.labelFontSize = settings.labelFontSize;
    }
    if (settings.labelBackgroundOpacity != undefined){
      measurement.labelBackgroundOpacity = settings.labelBackgroundOpacity;
    }
  }
}

export function updateMeasurementLabelOffset(id: string, newLabelOffset: number) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
    
    measurement.labelOffset = Math.max(0.1, Math.min(0.9, newLabelOffset));
  }
}

export function updateMeasurementColors(id: string, colors: {
  dimensionLineColor?: string;
  extensionLineColor?: string;
  arrowColor?: string;
}) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
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
}

export function updateMeasurementArrowSettings(id: string, settings: {
  arrowSize?: number;
  arrowStyle?: 'filled' | 'open' | 'none';
}) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
    if (settings.arrowSize !== undefined) {
      measurement.arrowSize = settings.arrowSize;
    }
    if (settings.arrowStyle) {
      measurement.arrowStyle = settings.arrowStyle;
    }
  }
}

export function updateMeasurementExtensionOverhang(id: string, overhang: number) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
    measurement.extensionOverhang = overhang;
  }
}


export function setActiveMeasurement(id: string | null) {
  activeMeasurementId = id;
}


export function getActiveMeasurement(): Measurement | null {
  if (!activeMeasurementId) return null;
  return measurements.find(m => m.id === activeMeasurementId) || null;
}


export function getActiveMeasurementId(): string | null {
  return activeMeasurementId;
}


export function clearAllMeasurements() {
  measurements = [];
  activeMeasurementId = null;
}


export function removeMeasurement(id: string) {
  measurements = measurements.filter(m => m.id !== id);
  if (activeMeasurementId === id) {
    activeMeasurementId = null;
  }
}


export function updateMeasurementCircleSettings(id: string, settings: {
  circleColor?: string;
  circleSize?: number;
  showCircles?: boolean;
}) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
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
}

/**
 * Update measurement points (used when shapes are transformed)
 * @param id - Measurement ID
 * @param newStart - New start point position
 * @param newEnd - New end point position
 */
export function updateMeasurementPoints(
  id: string, 
  newStart: THREE.Vector3, 
  newEnd: THREE.Vector3
) {
  const measurement = measurements.find(m => m.id === id);
  if (measurement) {
    measurement.startPoint.copy(newStart);
    measurement.endPoint.copy(newEnd);
    measurement.distance = newStart.distanceTo(newEnd);
  }
}

/**
 * Get all measurement IDs
 * Useful for tracking and updating multiple measurements
 */
export function getAllMeasurementIds(): string[] {
  return measurements.map(m => m.id);
}

/**
 * Check if a measurement exists
 */
export function measurementExists(id: string): boolean {
  return measurements.some(m => m.id === id);
}


