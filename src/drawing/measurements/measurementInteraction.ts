// src/drawing/measurements/measurementInteraction.ts
import * as THREE from 'three';

import {
  getMeasurementById,
  setActiveMeasurement,
  getActiveMeasurement,
  updateMeasurementOffset,
  updateMeasurementLabelOffset,
  getAllMeasurements,
  removeMeasurement,
  updateMeasurementDistance,
} from './measurementManager';
import { projectMouseToPlaneForDom } from '../sharedPointer';
import {
  removeMeasurementVisuals,
  updateMeasurementPositions,
  setMeasurementSelected,
  updateMeasurementColors,
  updateMeasurementGeometry,
} from './measurementRenderer';
import { convertDisplayToMeters } from './measurementUnits';
import {
  calculatePerpendicularDirection,
  clampDimensionOffset,
} from './measurementCalculator';
import { detachMeasurement } from './trackMeasurement';
import { useStore } from '../../store';
import { scene } from '../../core/scene';

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

export function deleteMeasurementById(measurementId: string) {
  const activeId = getActiveMeasurementId();

  // Clear selection if this one was active
  if (activeId === measurementId) {
    setMeasurementSelected(measurementId, false);
    setActiveMeasurement(null);
    useStore.getState().setActiveMeasurementId(null);
  }

  detachMeasurement(measurementId);
  removeMeasurement(measurementId);
  removeMeasurementVisuals(measurementId);
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

  const perpendicularDirection = calculatePerpendicularDirection(
    startPoint,
    endPoint
  );

  const mouseMovement = new THREE.Vector3().subVectors(
    currentMouseWorldPosition,
    dragStartMousePosition
  );

  const parallelMovement = mouseMovement.dot(lineDirection);
  const perpendicularMovement = mouseMovement.dot(perpendicularDirection);

  const rawOffset = initialDimensionOffset + perpendicularMovement;
  const newDimensionOffset = clampDimensionOffset(rawOffset, 20);
  updateMeasurementOffset(activeMeasurement.id, newDimensionOffset);

  const lineLength = startPoint.distanceTo(endPoint);
  const labelOffsetChange = lineLength !== 0 ? parallelMovement / lineLength : 0;
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

/**
 * Double‑click: inline edit label value and update distance
 */
export function handleLabelDoubleClick(
  event: MouseEvent,
  domElement: HTMLElement
) {
  const measurementId = findLabelAtMousePosition(event, domElement);
  if (!measurementId) return;

  const labelContainer = document.getElementById('measurement-labels');
  if (!labelContainer) return;

  const labelElement = labelContainer.querySelector(
    `[data-measurement-id="${measurementId}"]`
  ) as HTMLElement | null;
  if (!labelElement) return;

  const currentText = labelElement.textContent || '';

  // Create inline input over the label
  const input = document.createElement('input');
  input.type = 'text';
  input.value = extractNumericPart(currentText);
  input.style.position = 'absolute';
  input.style.left = labelElement.style.left;
  input.style.top = labelElement.style.top;
  input.style.transform = 'translate(-50%, -50%)';
  input.style.zIndex = '999';
  input.style.padding = '2px 4px';
  input.style.fontSize = labelElement.style.fontSize || '12px';

  labelElement.style.visibility = 'hidden';
  labelContainer.appendChild(input);
  input.focus();
  input.select();

  const commit = () => {
    const raw = input.value.trim();
    input.remove();
    labelElement.style.visibility = 'visible';

    if (!raw) return;
    const newMeters = convertDisplayToMeters(raw);
    if (!newMeters || newMeters <= 0) return;

    updateMeasurementDistance(measurementId, newMeters, scene);

    const m = getMeasurementById(measurementId);
    if (!m) return;

    updateMeasurementGeometry(measurementId);
    updateMeasurementPositions(measurementId, m);
    updateMeasurementColors(measurementId);
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
    if (e.key === 'Escape') {
      input.remove();
      labelElement.style.visibility = 'visible';
    }
  });
}

function extractNumericPart(text: string): string {
  const match = text.match(/[\d.]+/);
  return match ? match[0] : '';
}
