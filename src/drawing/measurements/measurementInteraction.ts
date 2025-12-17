// src/drawing/measurements/measurementInteraction.ts
import * as THREE from 'three';

import {
  getMeasurementById,
  setActiveMeasurement,
  getActiveMeasurement,
  updateMeasurementOffset,
  updateMeasurementLabelOffset,
  getAllMeasurements
} from './measurementManager';
import { projectMouseToPlaneForDom } from '../sharedPointer';
import { 
  
  updateMeasurementPositions,
  setMeasurementSelected,
  updateMeasurementColors,
  updateMeasurementGeometry
} from './measurementRenderer';
import { calculatePerpendicularDirection } from './measurementCalculator';
import { useStore } from '../../store';

// ✅ Module-level: Temporary drag state (NOT in Zustand)
let isDraggingLabel = false;
let dragStartMousePosition: THREE.Vector3 | null = null;
let initialDimensionOffset = 0;
let initialLabelOffset = 0.5;

/**
 * Get the currently active measurement ID from Zustand
 */
export function getActiveMeasurementId(): string | null {
  return useStore.getState().activeMeasurementId;
}

/**
 * Set the active measurement ID in Zustand
 */
export function setActiveMeasurementId(id: string | null) {
  const currentId = useStore.getState().activeMeasurementId;
  
  // Deselect previous measurement
  if (currentId && currentId !== id) {
    setMeasurementSelected(currentId, false);
  }
  
  // ✅ Update Zustand store (this triggers React re-render)
  useStore.getState().setActiveMeasurementId(id);
  
  // Update Three.js visuals
  if (id) {
    setMeasurementSelected(id, true);
    setActiveMeasurement(id);
  } else {
    setActiveMeasurement(null);
  }
}

/**
 * Raycasting: Check if mouse is over a measurement label
 */
export function findLabelAtMousePosition(
  event: MouseEvent,
  domElement: HTMLElement
): string | null {
  const bounds = domElement.getBoundingClientRect();
  const mouseX = event.clientX - bounds.left;
  const mouseY = event.clientY - bounds.top;

  const labelContainer = document.getElementById('measurement-labels');
  if (!labelContainer) return null;

  const labels = labelContainer.querySelectorAll('.measurement-label');
  
  for (const labelElement of Array.from(labels)) {
    const htmlLabel = labelElement as HTMLElement;
    const measurementId = htmlLabel.getAttribute('data-measurement-id');
    if (!measurementId) continue;

    const labelRect = htmlLabel.getBoundingClientRect();
    const containerRect = bounds;

    const labelLeft = labelRect.left - containerRect.left;
    const labelTop = labelRect.top - containerRect.top;
    const labelRight = labelLeft + labelRect.width;
    const labelBottom = labelTop + labelRect.height;

    if (
      mouseX >= labelLeft &&
      mouseX <= labelRight &&
      mouseY >= labelTop &&
      mouseY <= labelBottom
    ) {
      return measurementId;
    }
  }

  return null;
}

/**
 * Start dragging a label
 */
export function beginLabelDrag(
  measurementId: string,
  event: MouseEvent,
  domElement: HTMLElement
) {
  const measurement = getMeasurementById(measurementId);
  if (!measurement) return;

  // Set as active (updates Zustand)
  setActiveMeasurementId(measurementId);

  const mouseWorldPosition = projectMouseToPlaneForDom(event, domElement);
  if (!mouseWorldPosition) return;

  // ✅ Module-level drag state
  isDraggingLabel = true;
  dragStartMousePosition = mouseWorldPosition.clone();
  initialDimensionOffset = measurement.dimensionOffset;
  initialLabelOffset = measurement.labelOffset || 0.5;
}

/**
 * Update label drag
 */
export function updateLabelDrag(
  event: MouseEvent,
  domElement: HTMLElement
) {
  if (!isDraggingLabel) return;

  const activeMeasurement = getActiveMeasurement();
  if (!activeMeasurement) return;
  if (!dragStartMousePosition) return;

  const currentMouseWorldPosition = projectMouseToPlaneForDom(event, domElement);
  if (!currentMouseWorldPosition) return;

  const startPoint = activeMeasurement.startPoint;
  const endPoint = activeMeasurement.endPoint;

  const lineDirection = new THREE.Vector3()
    .subVectors(endPoint, startPoint)
    .normalize();

  const perpendicularDirection = calculatePerpendicularDirection(startPoint, endPoint);

  const mouseMovement = new THREE.Vector3()
    .subVectors(currentMouseWorldPosition, dragStartMousePosition);

  const parallelMovement = mouseMovement.dot(lineDirection);
  const perpendicularMovement = mouseMovement.dot(perpendicularDirection);

  const newDimensionOffset = initialDimensionOffset + perpendicularMovement;
  updateMeasurementOffset(activeMeasurement.id, newDimensionOffset);

  const lineLength = startPoint.distanceTo(endPoint);
  const labelOffsetChange = parallelMovement / lineLength;
  const newLabelOffset = initialLabelOffset + labelOffsetChange;
  updateMeasurementLabelOffset(activeMeasurement.id, newLabelOffset);

  updateMeasurementPositions(activeMeasurement.id, activeMeasurement);
}

/**
 * End label drag
 */
export function endLabelDrag() {
  isDraggingLabel = false;
  dragStartMousePosition = null;
  initialDimensionOffset = 0;
  initialLabelOffset = 0.5;
}

/**
 * Deselect active measurement
 */
export function deselectMeasurement() {
  const currentId = useStore.getState().activeMeasurementId;
  
  if (currentId) {
    setMeasurementSelected(currentId, false);
  }
  
  setActiveMeasurement(null);
  
  // ✅ Update Zustand (triggers React re-render)
  useStore.getState().setActiveMeasurementId(null);
}

/**
 * Check if currently dragging
 */
export function isLabelDragging(): boolean {
  return isDraggingLabel;
}

/**
 * Refresh all measurements
 */
export function refreshAllMeasurements() {
  const allMeasurements = getAllMeasurements();
  allMeasurements.forEach((measurement) => {
    updateMeasurementGeometry(measurement.id);
    updateMeasurementColors(measurement.id);
  });
}

/**
 * Handle label click for selection (uses raycasting)
 */
export function handleLabelClick(
  event: MouseEvent,
  domElement: HTMLElement
) {
  // ✅ Raycasting: Find what was clicked
  const measurementId = findLabelAtMousePosition(event, domElement);
  const currentId = useStore.getState().activeMeasurementId;
  
  if (measurementId) {
    // Toggle selection
    if (currentId === measurementId) {
      deselectMeasurement();
    } else {
      setActiveMeasurementId(measurementId);
    }
  } else {
    deselectMeasurement();
  }
}

export function setActiveMeasurementOffset(offset: number) {
  const m = getActiveMeasurement();
  if (!m) return;
  updateMeasurementOffset(m.id, offset);
  updateMeasurementPositions(m.id, m);
}
