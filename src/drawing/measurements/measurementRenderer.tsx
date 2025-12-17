// src/drawing/measurements/measurementRenderer.ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { scene } from '../../core/scene';
import { camera } from '../../core/camera';
import { canvas } from '../../core/renderer';
import { getMeasurementSettings, } from './measurementSettings';
import type { Measurement } from './measurementManager';
import { calculatePerpendicularDirection } from './measurementCalculator';
import { getMeasurementById,  } from './measurementManager';
import { hexToNumber } from '../../store';
import { CircleGeometry } from 'three';


// Store measurement objects for cleanup
const measurementObjects = new Map<string, THREE.Object3D[]>();
let measurementLabelContainer: HTMLDivElement | null = null;

// Expose map globally for interaction handler
(window as any).measurementObjectsMap = measurementObjects;

/**
 * Get measurement's own settings or fall back to defaults
 */
function getMeasurementOrDefaultSettings(measurement: Measurement) {
  const globalDefaults = getMeasurementSettings();
  
  return {
    dimensionLineColor: measurement.dimensionLineColor 
      ? hexToNumber(measurement.dimensionLineColor) 
      : globalDefaults.dimensionLineColor,
    extensionLineColor: measurement.extensionLineColor 
      ? hexToNumber(measurement.extensionLineColor) 
      : globalDefaults.extensionLineColor,
    arrowSize: measurement.arrowSize ?? globalDefaults.arrowSize,
    arrowStyle: measurement.arrowStyle ?? globalDefaults.arrowStyle,
    extensionOverhang: measurement.extensionOverhang ?? globalDefaults.extensionOverhang,
    
    // Label settings from measurement
    labelBackgroundColor: measurement.labelBackgroundColor ?? globalDefaults.labelBackgroundColor,
    labelTextColor: measurement.labelTextColor ?? globalDefaults.labelTextColor,
    labelFontSize: measurement.labelFontSize ?? globalDefaults.labelFontSize,
    labelBackgroundOpacity: measurement.labelBackgroundOpacity ?? globalDefaults.labelBackgroundOpacity,

    // These still come from global
    labelFontFamily: globalDefaults.labelFontFamily,
    labelPadding: globalDefaults.labelPadding,
    labelBorderRadius: globalDefaults.labelBorderRadius,

        circleColor: measurement.circleColor 
      ? hexToNumber(measurement.circleColor) 
      : globalDefaults.circleColor,
    circleSize: measurement.circleSize ?? globalDefaults.circleSize,
    showCircles: measurement.showCircles ?? globalDefaults.showCircles,
  };
}

/**
 * Initialize label container
 */
export function initializeMeasurementRenderer(canvasContainer: HTMLElement) {
  if (!measurementLabelContainer) {
    measurementLabelContainer = document.createElement('div');
    measurementLabelContainer.id = 'measurement-labels';
    measurementLabelContainer.style.position = 'absolute';
    measurementLabelContainer.style.top = '0';
    measurementLabelContainer.style.left = '0';
    measurementLabelContainer.style.pointerEvents = 'none';
    measurementLabelContainer.style.zIndex = '101';
    measurementLabelContainer.style.width = '100%';
    measurementLabelContainer.style.height = '100%';
    
    canvasContainer.appendChild(measurementLabelContainer);
  }
}

/**
 * Calculate effective overhang based on dimension offset
 * If offset is near zero, return 0 (no overhang needed)
 */
function getEffectiveOverhang(dimensionOffset: number, configuredOverhang: number): number {
  // If dimension line is directly on the measurement line (offset ≈ 0)
  if (Math.abs(dimensionOffset) < 0.1) {
    return 0; // No overhang needed
  }
  
  // Otherwise use the configured overhang
  return configuredOverhang;
}

// Add to the measurementObjects tracking
const measurementPointCircles = new Map<string, THREE.Mesh[]>();

/**
 * Create a small circle at a measurement point
 */
function createPointCircle(
  position: THREE.Vector3,
  color: number,
  radius: number
): THREE.Mesh {
  const geometry = new CircleGeometry(radius, 16);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    depthTest: false,
    transparent: true,
    opacity: 0.9
  });

  const circle = new THREE.Mesh(geometry, material);
  circle.position.copy(position);
  circle.renderOrder = 1001;
  (circle as any).isMeasurementPoint = true;
  (circle as any).isUiOnly = true;

  scene.add(circle);
  return circle;
}

/**
 * Create circles at both measurement points
 */
function createMeasurementPointCircles(
  measurementId: string,
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  color: number,
  size: number
): THREE.Mesh[] {
  const circles: THREE.Mesh[] = [];

  // Start point circle
  const startCircle = createPointCircle(startPoint, color, size);
  circles.push(startCircle);

  // End point circle
  const endCircle = createPointCircle(endPoint, color, size);
  circles.push(endCircle);

  measurementPointCircles.set(measurementId, circles);
  return circles;
}


/**
 * Update point circle positions
 */
function updateMeasurementPointCircles(
  measurementId: string,
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3
) {
  const circles = measurementPointCircles.get(measurementId);
  if (!circles || circles.length !== 2) return;

  circles[0].position.copy(startPoint);
  circles[1].position.copy(endPoint);
}

/**
 * Remove point circles for a measurement
 */
function removeMeasurementPointCircles(measurementId: string) {
  const circles = measurementPointCircles.get(measurementId);
  if (!circles) return;

  circles.forEach(circle => {
    scene.remove(circle);
    circle.geometry.dispose();
    (circle.material as THREE.Material).dispose();
  });

  measurementPointCircles.delete(measurementId);
}

/**
 * Create filled arrow (equilateral triangle)
 */
function createFilledArrow(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  color: number,
  arrowSize: number
): THREE.Mesh {
  const height = arrowSize * Math.sqrt(3) / 2;
  
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    height, 0, 0,
    0, -arrowSize / 2, 0,
    0, arrowSize / 2, 0
  ]);
  
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2]);
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    depthTest: false
  });
  
  const arrow = new THREE.Mesh(geometry, material);
  arrow.position.copy(position);
  arrow.renderOrder = 1000;
  
  const angle = Math.atan2(direction.y, direction.x);
  arrow.rotation.z = angle;
  
  (arrow as any).isMeasurementArrow = true;
  (arrow as any).isUiOnly = true;
  
  return arrow;
}

/**
 * Create dimension line with arrows
 */
function createMeasurementLine(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  color: number,
  arrowSize: number,
  arrowStyle: 'filled' | 'open' | 'none'
): THREE.Object3D[] {
  const objects: THREE.Object3D[] = [];
  
  // Create line
  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions([
    startPoint.x, startPoint.y, startPoint.z,
    endPoint.x, endPoint.y, endPoint.z
  ]);
  
  const lineMaterial = new LineMaterial({
    color: color,
    linewidth: 3,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    worldUnits: false
  });
  
  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();
  line.renderOrder = 999;
  (line as any).isMeasurementLine = true;
  (line as any).isUiOnly = true;
  
  scene.add(line);
  objects.push(line as any);
  
  // Create arrows
  if (arrowStyle !== 'none') {
    const arrowHeight = arrowSize * Math.sqrt(3) / 2;
    
    const forwardDirection = new THREE.Vector3()
      .subVectors(endPoint, startPoint)
      .normalize();
    const backwardDirection = forwardDirection.clone().negate();
    
    const startArrowPos = startPoint.clone().add(
      forwardDirection.clone().multiplyScalar(arrowHeight)
    );
    const endArrowPos = endPoint.clone().add(
      backwardDirection.clone().multiplyScalar(arrowHeight)
    );
    
    const arrow1 = createFilledArrow(startArrowPos, backwardDirection, color, arrowSize);
    const arrow2 = createFilledArrow(endArrowPos, forwardDirection, color, arrowSize);
    
    (arrow1 as any).isUiOnly = true;
    (arrow2 as any).isUiOnly = true;
    
    scene.add(arrow1);
    scene.add(arrow2);
    objects.push(arrow1, arrow2);
  }
  
  return objects;
}

/**
 * Create extension lines (legs)
 */
function createExtensionLines(
  point: THREE.Vector3,
  extensionDirection: THREE.Vector3,
  offset: number,
  extensionColor: number,
  extensionOverhang: number
): THREE.Object3D {

  //  Use effective overhang based on offset
  const effectiveOverhang = getEffectiveOverhang(offset, extensionOverhang);
  const totalExtensionLength = Math.abs(offset) + effectiveOverhang;
  
  const extensionStart = point.clone();
  const extensionEnd = point.clone().add(
    extensionDirection.clone().multiplyScalar(totalExtensionLength)
  );

  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions([
    extensionStart.x, extensionStart.y, extensionStart.z,
    extensionEnd.x, extensionEnd.y, extensionEnd.z
  ]);

  const lineMaterial = new LineMaterial({
    color: extensionColor,
    linewidth: 2,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    worldUnits: false
  });

  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();
  line.renderOrder = 998;
  (line as any).isMeasurementExtension = true;
  (line as any).isUiOnly = true;

  scene.add(line as any);
  return line as any;
}


function applyColorWithOpacity(color: string, opacity: number): string {
  // Convert rgb() to rgba()
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
  }
  // Update existing rgba()
  if (color.startsWith('rgba(')) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  // Convert hex to rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  // Fallback
  return color;
}

/**
 * Create measurement label
 */
function createMeasurementLabel(
  text: string,
  _position: THREE.Vector3,
  measurementId: string,
  settings: ReturnType<typeof getMeasurementOrDefaultSettings>
): HTMLDivElement {
  if (!measurementLabelContainer) {
    throw new Error('Measurement label container not initialized');
  }
  
  const label = document.createElement('div');
  label.className = 'measurement-label';
  label.textContent = text;
  label.style.position = 'absolute';
 label.style.background = applyColorWithOpacity(
    settings.labelBackgroundColor, 
    settings.labelBackgroundOpacity
  );
   label.style.color = settings.labelTextColor;
  label.style.padding = settings.labelPadding;
  label.style.borderRadius = settings.labelBorderRadius;
  label.style.fontSize = `${settings.labelFontSize}px`;
  label.style.fontFamily = settings.labelFontFamily;
  label.style.fontWeight = 'bold';
  label.style.whiteSpace = 'nowrap';
  label.style.transform = 'translate(-50%, -50%)';
  label.style.pointerEvents = 'none';
  label.setAttribute('data-measurement-id', measurementId);
  
  measurementLabelContainer.appendChild(label);
  
  return label;
}

/**
 * Project 3D position to 2D screen coordinates
 */
function projectToScreen(
  worldPosition: THREE.Vector3,
  domElement: HTMLElement
): { x: number; y: number } {
  const vector = worldPosition.clone();
  vector.project(camera);
  
  const bounds = domElement.getBoundingClientRect();
  const screenX = (vector.x * 0.5 + 0.5) * bounds.width;
  const screenY = (-(vector.y * 0.5) + 0.5) * bounds.height;
  
  return { x: screenX, y: screenY };
}

/**
 * Render complete measurement (first time creation)
 */
export function renderMeasurement(
  measurement: Measurement,
  canvas: HTMLCanvasElement
) {
  // Use measurement's own settings
  const settings = getMeasurementOrDefaultSettings(measurement);
  const objects: THREE.Object3D[] = [];
  
  const startPoint = measurement.startPoint;
  const endPoint = measurement.endPoint;
  const offset = measurement.dimensionOffset;
  const labelOffset = measurement.labelOffset || 0.5;
  
  // Calculate perpendicular direction
  const perpDirection = calculatePerpendicularDirection(startPoint, endPoint);
  const extensionDirection = offset >= 0 ? perpDirection : perpDirection.clone().negate();

  // Calculate dimension line positions
  const dimLineStart = startPoint.clone().add(
    extensionDirection.clone().multiplyScalar(Math.abs(offset))
  );
  const dimLineEnd = endPoint.clone().add(
    extensionDirection.clone().multiplyScalar(Math.abs(offset))
  );
  
  // Create extension lines with measurement's own color and overhang
  const ext1 = createExtensionLines(
    startPoint, 
    extensionDirection, 
    offset,
    settings.extensionLineColor,
    settings.extensionOverhang
  );
  const ext2 = createExtensionLines(
    endPoint, 
    extensionDirection, 
    offset,
    settings.extensionLineColor,
    settings.extensionOverhang
  );
  objects.push(ext1, ext2);
  
  // Create dimension line with measurement's own settings
  const lineObjects = createMeasurementLine(
    dimLineStart,
    dimLineEnd,
    settings.dimensionLineColor,
    settings.arrowSize,
    settings.arrowStyle
  );
  objects.push(...lineObjects);

    //  Create point circles at start and end
  if (settings.showCircles) {
    createMeasurementPointCircles(
      measurement.id,
      startPoint,
      endPoint,
      settings.circleColor,
      settings.circleSize
    );
  }
  
  // Create label with measurement's own settings
  const labelPosition = new THREE.Vector3().lerpVectors(
    dimLineStart, 
    dimLineEnd, 
    labelOffset
  );
  const distanceText = `${measurement.distance.toFixed(2)} m`;
  const label = createMeasurementLabel(distanceText, labelPosition, measurement.id, settings);
  
  // Store for cleanup
  measurementObjects.set(measurement.id, objects);
  
  // Update label position
  updateMeasurementLabel(label, labelPosition, canvas);
}

/**
 * Update existing measurement positions (during drag)
 */
export function updateMeasurementPositions(
  measurementId: string,
  measurement: Measurement
) {
  const settings = getMeasurementOrDefaultSettings(measurement);
  const objects = measurementObjects.get(measurementId);
  if (!objects || objects.length === 0) {
    renderMeasurement(measurement, canvas);
    return;
  }

  const startPoint = measurement.startPoint;
  const endPoint = measurement.endPoint;
  const offset = measurement.dimensionOffset;
  const labelOffset = measurement.labelOffset || 0.5;

  const perpDirection = calculatePerpendicularDirection(startPoint, endPoint);
  
  const effectiveOverhang = getEffectiveOverhang(offset, settings.extensionOverhang);
  const totalExtensionLength = Math.abs(offset) + effectiveOverhang;

  const extensionDirection = offset >= 0 ? perpDirection : perpDirection.clone().negate();

  const dimLineStart = startPoint.clone().add(
    extensionDirection.clone().multiplyScalar(Math.abs(offset))
  );
  const dimLineEnd = endPoint.clone().add(
    extensionDirection.clone().multiplyScalar(Math.abs(offset))
  );

  let objectIndex = 0;

  // Update extension line 1
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementExtension) {
    const ext1 = objects[objectIndex] as any;
    const ext1Start = startPoint.clone();
    const ext1End = startPoint.clone().add(
      extensionDirection.clone().multiplyScalar(totalExtensionLength)
    );
    
    if (ext1.geometry && ext1.geometry.setPositions) {
      ext1.geometry.setPositions([
        ext1Start.x, ext1Start.y, ext1Start.z,
        ext1End.x, ext1End.y, ext1End.z
      ]);
      ext1.computeLineDistances();
    }
    objectIndex++;
  }

  // Update extension line 2
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementExtension) {
    const ext2 = objects[objectIndex] as any;
    const ext2Start = endPoint.clone();
    const ext2End = endPoint.clone().add(
      extensionDirection.clone().multiplyScalar(totalExtensionLength)
    );
    
    if (ext2.geometry && ext2.geometry.setPositions) {
      ext2.geometry.setPositions([
        ext2Start.x, ext2Start.y, ext2Start.z,
        ext2End.x, ext2End.y, ext2End.z
      ]);
      ext2.computeLineDistances();
    }
    objectIndex++;
  }

  // Update dimension line
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementLine) {
    const dimLine = objects[objectIndex] as any;
    
    if (dimLine.geometry && dimLine.geometry.setPositions) {
      dimLine.geometry.setPositions([
        dimLineStart.x, dimLineStart.y, dimLineStart.z,
        dimLineEnd.x, dimLineEnd.y, dimLineEnd.z
      ]);
      dimLine.computeLineDistances();
    }
    objectIndex++;
  }

    // Update point circle positions
  updateMeasurementPointCircles(measurementId, startPoint, endPoint);

  // Update arrows positions
  const arrowSize = settings.arrowSize;
  const arrowHeight = arrowSize * Math.sqrt(3) / 2;
  
  const forwardDirection = new THREE.Vector3()
    .subVectors(dimLineEnd, dimLineStart)
    .normalize();
  const backwardDirection = forwardDirection.clone().negate();
  
  const startArrowPos = dimLineStart.clone().add(
    forwardDirection.clone().multiplyScalar(arrowHeight)
  );
  const endArrowPos = dimLineEnd.clone().add(
    backwardDirection.clone().multiplyScalar(arrowHeight)
  );

  // Update arrow 1 position and rotation
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementArrow) {
    const arrow1 = objects[objectIndex] as THREE.Mesh;
    arrow1.position.copy(startArrowPos);
    const angle1 = Math.atan2(backwardDirection.y, backwardDirection.x);
    arrow1.rotation.z = angle1;
    objectIndex++;
  }

  // Update arrow 2 position and rotation
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementArrow) {
    const arrow2 = objects[objectIndex] as THREE.Mesh;
    arrow2.position.copy(endArrowPos);
    const angle2 = Math.atan2(forwardDirection.y, forwardDirection.x);
    arrow2.rotation.z = angle2;
    objectIndex++;
  }

  // Update label position
  const labelPosition = new THREE.Vector3().lerpVectors(
    dimLineStart,
    dimLineEnd,
    labelOffset
  );

  const labelContainer = document.getElementById('measurement-labels');
  if (labelContainer) {
    const labelElement = labelContainer.querySelector(
      `[data-measurement-id="${measurementId}"]`
    ) as HTMLElement;
    
    if (labelElement) {
      const screenPos = projectToScreen(labelPosition, canvas);
      labelElement.style.left = `${screenPos.x}px`;
      labelElement.style.top = `${screenPos.y}px`;
      labelElement.textContent = `${measurement.distance.toFixed(2)} m`;
    }
  }
}

/**
 * Update geometry that depends on settings (overhang, arrow size/style)
 */
export function updateMeasurementGeometry(measurementId: string) {
  const measurement = getMeasurementById(measurementId);
  if (!measurement) return;
  
  const settings = getMeasurementOrDefaultSettings(measurement);
  const objects = measurementObjects.get(measurementId);

  if (!objects) return;

  const startPoint = measurement.startPoint;
  const endPoint = measurement.endPoint;
  const offset = measurement.dimensionOffset;

  const perpDirection = calculatePerpendicularDirection(startPoint, endPoint);

  const effectiveOverhang = getEffectiveOverhang(offset, settings.extensionOverhang);
const totalExtensionLength = Math.abs(offset) + effectiveOverhang;

const extensionDirection = offset >= 0 ? perpDirection : perpDirection.clone().negate();

  const dimLineStart = startPoint.clone().add(
    extensionDirection.clone().multiplyScalar(Math.abs(offset))
  );
  const dimLineEnd = endPoint.clone().add(
    extensionDirection.clone().multiplyScalar(Math.abs(offset))
  );

  let objectIndex = 0;
  
  // Update extension line 1 geometry
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementExtension) {
    const ext1 = objects[objectIndex] as any;
    const ext1Start = startPoint.clone();
    const ext1End = startPoint.clone().add(
      extensionDirection.clone().multiplyScalar(totalExtensionLength)
    );

    if (ext1.geometry && ext1.geometry.setPositions) {
      ext1.geometry.setPositions([
        ext1Start.x, ext1Start.y, ext1Start.z,
        ext1End.x, ext1End.y, ext1End.z
      ]);
      ext1.computeLineDistances();
    }
    objectIndex++;
  }

  // Update extension line 2 geometry
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementExtension) {
    const ext2 = objects[objectIndex] as any;
    const ext2Start = endPoint.clone();
    const ext2End = endPoint.clone().add(
      extensionDirection.clone().multiplyScalar(totalExtensionLength)
    );

    if (ext2.geometry && ext2.geometry.setPositions) {
      ext2.geometry.setPositions([
        ext2Start.x, ext2Start.y, ext2Start.z,
        ext2End.x, ext2End.y, ext2End.z
      ]);
      ext2.computeLineDistances();
    }
    objectIndex++;
  }

  // Skip dimension line
  if (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementLine) {
    objectIndex++;
  }

  // Rebuild arrows
  const dimForward = new THREE.Vector3()
    .subVectors(dimLineEnd, dimLineStart)
    .normalize();
  const dimBackward = dimForward.clone().negate();

  const arrowSize = settings.arrowSize;
  const arrowHeight = arrowSize * Math.sqrt(3) / 2;
  const startArrowPos = dimLineStart.clone().add(
    dimForward.clone().multiplyScalar(arrowHeight)
  );
  const endArrowPos = dimLineEnd.clone().add(
    dimBackward.clone().multiplyScalar(arrowHeight)
  );

  // Remove old arrow meshes
  while (objects[objectIndex] && (objects[objectIndex] as any).isMeasurementArrow) {
    const oldArrow = objects[objectIndex] as THREE.Mesh;
    scene.remove(oldArrow);
    oldArrow.geometry.dispose();
    if (Array.isArray(oldArrow.material)) {
      oldArrow.material.forEach(m => m.dispose());
    } else {
      oldArrow.material.dispose();
    }
    objects.splice(objectIndex, 1);
  }

  // Create new arrows
  if (settings.arrowStyle !== 'none') {
    const arrow1 = createFilledArrow(startArrowPos, dimBackward, settings.dimensionLineColor, arrowSize);
    const arrow2 = createFilledArrow(endArrowPos, dimForward, settings.dimensionLineColor, arrowSize);

    (arrow1 as any).isMeasurementArrow = true;
    (arrow2 as any).isMeasurementArrow = true;
    (arrow1 as any).isUiOnly = true;
    (arrow2 as any).isUiOnly = true;

    scene.add(arrow1);
    scene.add(arrow2);

    objects.push(arrow1, arrow2);
  }
}

/**
 * Update measurement colors and styles
 */
export function updateMeasurementColors(measurementId: string) {
  const measurement = getMeasurementById(measurementId);
  if (!measurement) return;
  
  const settings = getMeasurementOrDefaultSettings(measurement);
  const objects = measurementObjects.get(measurementId);
  
  if (!objects) return;
  
  // Update colors of all objects
  objects.forEach(obj => {
    const anyObj = obj as any;
    
    if (anyObj.isMeasurementLine && anyObj.material) {
      anyObj.material.color.setHex(settings.dimensionLineColor);
      anyObj.material.needsUpdate = true;
    }
    if (anyObj.isMeasurementExtension && anyObj.material) {
      anyObj.material.color.setHex(settings.extensionLineColor);
      anyObj.material.needsUpdate = true;
    }
    if (anyObj.isMeasurementArrow && obj instanceof THREE.Mesh) {
      obj.material.color.setHex(settings.dimensionLineColor);
      obj.material.needsUpdate = true;
    }
  });
  
  
  const circles = measurementPointCircles.get(measurementId);
  if (circles) {
    circles.forEach(circle => {
      const material = circle.material as THREE.MeshBasicMaterial;
      material.color.setHex(settings.circleColor);
      material.needsUpdate = true;
    });
  }
  
  // Update label styles
  const labelElement = measurementLabelContainer?.querySelector(
    `[data-measurement-id="${measurementId}"]`
  ) as HTMLElement;
  
 if (labelElement) {
    
    labelElement.style.background = applyColorWithOpacity(
      settings.labelBackgroundColor,
      settings.labelBackgroundOpacity
    );
    
    labelElement.style.color = settings.labelTextColor;
    labelElement.style.fontSize = `${settings.labelFontSize}px`;
  }
}



export function updateMeasurementCircleGeometry(measurementId: string) {
  const measurement = getMeasurementById(measurementId);
  if (!measurement) return;
  
  const settings = getMeasurementOrDefaultSettings(measurement);
  const circles = measurementPointCircles.get(measurementId);
  
  if (!circles) return;
  
  // Update circle sizes
  circles.forEach(circle => {
    // Recreate geometry with new size
    circle.geometry.dispose();
    circle.geometry = new CircleGeometry(settings.circleSize, 16);
  });
}

// ✅ NEW: Toggle circle visibility
export function updateMeasurementCircleVisibility(measurementId: string) {
  const measurement = getMeasurementById(measurementId);
  if (!measurement) return;
  
  const settings = getMeasurementOrDefaultSettings(measurement);
  const circles = measurementPointCircles.get(measurementId);
  
  if (settings.showCircles) {
    // Show circles
    if (!circles || circles.length === 0) {
      // Create circles if they don't exist
      createMeasurementPointCircles(
        measurementId,
        measurement.startPoint,
        measurement.endPoint,
        settings.circleColor,
        settings.circleSize
      );
    } else {
      // Make existing circles visible
      circles.forEach(circle => {
        circle.visible = true;
      });
    }
  } else {
    // Hide circles
    if (circles) {
      circles.forEach(circle => {
        circle.visible = false;
      });
    }
  }
}



/**
 * Update measurement label position
 */
export function updateMeasurementLabel(
  label: HTMLDivElement,
  worldPosition: THREE.Vector3,
  canvas: HTMLCanvasElement
) {
  const screenPos = projectToScreen(worldPosition, canvas);
  label.style.left = `${screenPos.x}px`;
  label.style.top = `${screenPos.y}px`;
}

/**
 * Update all measurement label positions
 */
export function updateAllMeasurementLabels(canvas: HTMLCanvasElement) {
  if (!measurementLabelContainer) return;
  
  measurementObjects.forEach((_objects, measurementId) => {
    const labelElement = measurementLabelContainer!.querySelector(
      `[data-measurement-id="${measurementId}"]`
    ) as HTMLElement;
    
    if (!labelElement) return;
    
    const measurement = getMeasurementById(measurementId);
    if (!measurement) return;
    
    // const settings = getMeasurementOrDefaultSettings(measurement);
    
    const startPoint = measurement.startPoint;
    const endPoint = measurement.endPoint;
    const offset = measurement.dimensionOffset;
    const labelOffset = measurement.labelOffset || 0.5;
    
    const perpDirection = calculatePerpendicularDirection(startPoint, endPoint);
    const extensionDirection = offset >= 0 ? perpDirection : perpDirection.clone().negate();
    
    const dimLineStart = startPoint.clone().add(
      extensionDirection.clone().multiplyScalar(Math.abs(offset))
    );
    const dimLineEnd = endPoint.clone().add(
      extensionDirection.clone().multiplyScalar(Math.abs(offset))
    );
    
    const labelPosition = new THREE.Vector3().lerpVectors(
      dimLineStart,
      dimLineEnd,
      labelOffset
    );
    
    const screenPos = projectToScreen(labelPosition, canvas);
    labelElement.style.left = `${screenPos.x}px`;
    labelElement.style.top = `${screenPos.y}px`;
  });
}

/**
 * Highlight measurement as selected
 */
export function setMeasurementSelected(measurementId: string, selected: boolean) {
  const measurement = getMeasurementById(measurementId);
  if (!measurement) return;
  
  const settings = getMeasurementOrDefaultSettings(measurement);
  const objects = measurementObjects.get(measurementId);
  if (!objects) return;

  // Update object colors
  objects.forEach(obj => {
    const anyObj = obj as any;
    
    if (anyObj.isMeasurementLine && anyObj.material) {
      anyObj.material.color.setHex(settings.dimensionLineColor);
      anyObj.material.needsUpdate = true;
    }
    
    if (anyObj.isMeasurementExtension && anyObj.material) {
      anyObj.material.color.setHex(settings.extensionLineColor);
      anyObj.material.needsUpdate = true;
    }
    
    if (anyObj.isMeasurementArrow && obj instanceof THREE.Mesh) {
      obj.material.color.setHex(settings.dimensionLineColor);
      obj.material.needsUpdate = true;
    }
  });

  // Update label
  if (measurementLabelContainer) {
    const labelElement = measurementLabelContainer.querySelector(
      `[data-measurement-id="${measurementId}"]`
    ) as HTMLElement;
    
    if (labelElement) {
      if (selected) {
        labelElement.style.background = applyColorWithOpacity(
        settings.labelBackgroundColor,
        settings.labelBackgroundOpacity
      );
        labelElement.style.color = settings.labelTextColor;
        labelElement.style.fontWeight = 'bold';
        labelElement.style.boxShadow = '0 0 8px rgba(255, 170, 0, 0.8)';
      } else {
        labelElement.style.background = applyColorWithOpacity(
        settings.labelBackgroundColor,
        settings.labelBackgroundOpacity
      );
        labelElement.style.color = settings.labelTextColor;
        labelElement.style.fontWeight = 'bold';
        labelElement.style.boxShadow = 'none';
      }
    }
  }
}


/**
 * Clear all measurement visuals
 */
export function clearAllMeasurementVisuals() {
  measurementObjects.forEach((objects) => {
    objects.forEach(obj => {
      scene.remove(obj);
      
      const anyObj = obj as any;
      
      if (anyObj.isLine2) {
        if (anyObj.geometry) anyObj.geometry.dispose();
        if (anyObj.material) anyObj.material.dispose();
      } 
      else if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
      else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  });
  measurementObjects.clear();

  measurementPointCircles.forEach((_circles, measurementId) =>{
    removeMeasurementPointCircles(measurementId);
  });
    measurementPointCircles.clear();
  
  if (measurementLabelContainer) {
    measurementLabelContainer.innerHTML = '';
  }
}

/**
 * Remove specific measurement visuals
 */
export function removeMeasurementVisuals(measurementId: string) {
  const objects = measurementObjects.get(measurementId);
  if (objects) {
    objects.forEach(obj => {
      scene.remove(obj);
      
      const anyObj = obj as any;
      
      if (anyObj.isLine2) {
        if (anyObj.geometry) anyObj.geometry.dispose();
        if (anyObj.material) anyObj.material.dispose();
      }
      else if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
      else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    measurementObjects.delete(measurementId);
  }

  removeMeasurementPointCircles(measurementId);
  
  if (measurementLabelContainer) {
    const label = measurementLabelContainer.querySelector(
      `[data-measurement-id="${measurementId}"]`
    );
    if (label) {
      label.remove();
    }
  }
}
