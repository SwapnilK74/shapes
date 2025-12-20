// src/drawing/dimensions/dimensionRenderer.ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { scene } from '../../core/scene';
import { camera } from '../../core/camera';
import type { DimensionLine, DimensionLabel } from './dimensionManager';
import {
  generateDimensionId,
  addDimensionLine,
  addDimensionLabel,
  getActiveDimensionLabels,
} from './dimensionManager';
import type { ArrowStyle } from './dimensionSettings';



let dimensionLabelContainer: HTMLDivElement | null = null;

export function initializeDimensionRenderer(canvasContainer: HTMLElement) {
  dimensionLabelContainer = document.createElement('div');
  dimensionLabelContainer.id = 'dimension-labels';
  dimensionLabelContainer.style.position = 'absolute';
  dimensionLabelContainer.style.top = '0';
  dimensionLabelContainer.style.left = '0';
  dimensionLabelContainer.style.pointerEvents = 'none';
  dimensionLabelContainer.style.zIndex = '100';
  dimensionLabelContainer.style.width = '100%';
  dimensionLabelContainer.style.height = '100%';

  canvasContainer.appendChild(dimensionLabelContainer);
}



export function projectToScreen(
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

// --- ARROW CREATION ---

/**
 * Creates a filled equilateral triangle arrow
 */
function createFilledArrow(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  color: number
): THREE.Mesh {
  const arrowSize = 0.15; // Side length of equilateral triangle
  
  // For equilateral triangle: height = size * sqrt(3) / 2
  const height = arrowSize * Math.sqrt(3) / 2;
  
  const geometry = new THREE.BufferGeometry();

  // Equilateral triangle with base at origin, tip pointing away
  const vertices = new Float32Array([
    height, 0, 0,                         // Tip (points away from line)
    0, -arrowSize / 2, 0,                 // Base left
    0, arrowSize / 2, 0                   // Base right
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([0, 1, 2]);

  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide
  });

  const arrow = new THREE.Mesh(geometry, material);
  arrow.position.copy(position);

  // Rotate to point along dimension line direction
  const angle = Math.atan2(direction.y, direction.x);
  arrow.rotation.z = angle;

  (arrow as any).isUiOnly = true;

  return arrow;
}

/**
 * Creates an open arrow (two lines forming equilateral V)
 */
function createOpenArrow(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  color: number
): THREE.Mesh {
  const arrowSize = 0.15; // Side length
  const height = arrowSize * Math.sqrt(3) / 2;
  
  const geometry = new THREE.BufferGeometry();

  // V shape with base at origin, tip pointing away
  const vertices = new Float32Array([
    0, -arrowSize / 2, 0,                 // Left leg end
    height, 0, 0,                         // Tip (points away)
    height, 0, 0,                         // Tip (repeated for second line)
    0, arrowSize / 2, 0                   // Right leg end
  ]);

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({
    color: color,
    linewidth: 2
  });

  const arrow = new THREE.LineSegments(geometry, material);
  arrow.position.copy(position);

  // Rotate to point along dimension line direction
  const angle = Math.atan2(direction.y, direction.x);
  arrow.rotation.z = angle;

  (arrow as any).isUiOnly = true;

  return arrow as any;
}

/**
 * Creates arrows at both ends of a dimension line pointing OUTWARD (away from each other)
 */
function createArrows(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  color: number,
  arrowStyle: ArrowStyle
): THREE.Mesh[] {
  if (arrowStyle === 'none') return [];

  const arrowSize = 0.15;
  const arrowHeight = arrowSize * Math.sqrt(3) / 2;

  // Direction from start to end
  const forwardDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  // Direction from end to start
  const backwardDirection = forwardDirection.clone().negate();

  // Move arrow positions INWARD by arrow height so tips touch extension lines
  const startArrowPosition = startPoint.clone().add(
    forwardDirection.clone().multiplyScalar(arrowHeight)
  );
  const endArrowPosition = endPoint.clone().add(
    backwardDirection.clone().multiplyScalar(arrowHeight)
  );

  const arrows: THREE.Mesh[] = [];

  if (arrowStyle === 'filled') {
    
    arrows.push(createFilledArrow(startArrowPosition, backwardDirection, color));
    
    arrows.push(createFilledArrow(endArrowPosition, forwardDirection, color));
  } else if (arrowStyle === 'open') {
    
    arrows.push(createOpenArrow(startArrowPosition, backwardDirection, color));
   
    arrows.push(createOpenArrow(endArrowPosition, forwardDirection, color));
  }

  return arrows;
}

// --- DIMENSION LINE CREATION ---

export function createDimensionLine(
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  color: number = 0x703B3B,
  arrowStyle?: ArrowStyle
): DimensionLine {
  // Determine line thickness based on color
  const lineWidth = color === 0x703B3B ? 3 : 3; 

  // Create thick line using Line2
  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions([
    startPoint.x, startPoint.y, startPoint.z,
    endPoint.x, endPoint.y, endPoint.z
  ]);

  const lineMaterial = new LineMaterial({
    color: color,
    linewidth: lineWidth, 
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    worldUnits: false // Use screen pixels
  });

  const lineObject = new Line2(lineGeometry, lineMaterial);
  lineObject.computeLineDistances();
  lineObject.renderOrder = 999;
  (lineObject as any).isUiOnly = true;

  scene.add(lineObject);

  // Create arrows ONLY for white dimension lines (not gray extension lines)
  const arrowObjects: THREE.Mesh[] = [];
  
  if (color === 0x703B3B && arrowStyle) {
    const arrows = createArrows(startPoint, endPoint, color, arrowStyle);
    
    // Add arrows to scene
    for (const arrow of arrows) {
      scene.add(arrow);
      arrowObjects.push(arrow);
    }
  }

  const dimensionLine: DimensionLine = {
    id: generateDimensionId(),
    startPoint: startPoint.clone(),
    endPoint: endPoint.clone(),
    color: color,
    lineObject: lineObject as any, 
    arrowObjects: arrowObjects
  };

  addDimensionLine(dimensionLine);

  return dimensionLine;
}

// --- DIMENSION LABEL CREATION ---

export function createDimensionLabel(
  text: string,
  worldPosition: THREE.Vector3
): DimensionLabel {
  if (!dimensionLabelContainer) {
    console.error('Dimension label container not initialized');
    return {
      id: generateDimensionId(),
      worldPosition: worldPosition.clone(),
      text: text,
      htmlElement: null
    };
  }

  const labelElement = document.createElement('div');
  labelElement.className = 'dimension-label';
  labelElement.textContent = text;
  labelElement.style.position = 'absolute';
  labelElement.style.background = 'rgba(0, 0, 0, 0.7)';
  labelElement.style.color = 'white';
  labelElement.style.padding = '4px 8px';
  labelElement.style.borderRadius = '4px';
  labelElement.style.fontSize = '12px';
  labelElement.style.fontFamily = 'monospace';
  labelElement.style.whiteSpace = 'nowrap';
  labelElement.style.transform = 'translate(-50%, -50%)';

  dimensionLabelContainer.appendChild(labelElement);

  const dimensionLabel: DimensionLabel = {
    id: generateDimensionId(),
    worldPosition: worldPosition.clone(),
    text: text,
    htmlElement: labelElement
  };

  addDimensionLabel(dimensionLabel);

  return dimensionLabel;
}

// --- UPDATE LABEL POSITIONS ---

export function updateAllDimensionLabels(domElement: HTMLElement) {
  const labels = getActiveDimensionLabels();

  for (const label of labels) {
    if (!label.htmlElement) continue;

    const screenPosition = projectToScreen(label.worldPosition, domElement);

    label.htmlElement.style.left = `${screenPosition.x}px`;
    label.htmlElement.style.top = `${screenPosition.y}px`;
  }
}

// --- CLEANUP ---

export function clearDimensionLines() {
  // Handled by dimensionManager.ts clearAllDimensions()
}

export function clearDimensionLabels() {
  // Handled by dimensionManager.ts clearAllDimensions()
}
