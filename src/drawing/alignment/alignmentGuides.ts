// src/drawing/alignment/alignmentGuides.ts
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { AlignmentCandidate, } from './alignmentDetection';
import { getShapeBounds } from './alignmentDetection';

// Store active guide lines
let activeGuideLines: Line2[] = [];

/**
 * Create a visual guide line (pink/magenta)
 */
function createGuideLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number = 0xff00ff // Magenta
): Line2 {
  const positions = [
    start.x, start.y, start.z,
    end.x, end.y, end.z
  ];

  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions(positions);

  const lineMaterial = new LineMaterial({
    color: color,
    linewidth: 2,
    dashed: false,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    worldUnits: false
  });

  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();
  line.renderOrder = 1000; // Render on top
  (line as any).isAlignmentGuide = true;
  (line as any).isUiOnly = true;

  return line;
}

/**
 * Update alignment guide lines based on current alignments
 */
export function updateAlignmentGuides(
  scene: THREE.Scene,
  draggedShape: THREE.Mesh | null,
  horizontalAlignment: AlignmentCandidate | null,
  verticalAlignment: AlignmentCandidate | null
) {
  // Clear old guides
  clearAlignmentGuides(scene);

  if (!draggedShape) return;

  const draggedBounds = getShapeBounds(draggedShape);
  // const sceneExtent = 50; // How far the guide lines extend

  // Create vertical guide line
  if (verticalAlignment) {
    const targetBounds = getShapeBounds(verticalAlignment.targetShape);
    const x = verticalAlignment.alignmentValue;
    
    // Extend line from top to bottom of scene
    const minY = Math.min(draggedBounds.bottom, targetBounds.bottom) - 5;
    const maxY = Math.max(draggedBounds.top, targetBounds.top) + 5;
    
    const start = new THREE.Vector3(x, minY, 0.1);
    const end = new THREE.Vector3(x, maxY, 0.1);
    
    const guideLine = createGuideLine(start, end, 0xff00ff);
    scene.add(guideLine);
    activeGuideLines.push(guideLine);
  }

  // Create horizontal guide line
  if (horizontalAlignment) {
    const targetBounds = getShapeBounds(horizontalAlignment.targetShape);
    const y = horizontalAlignment.alignmentValue;
    
    // Extend line from left to right of scene
    const minX = Math.min(draggedBounds.left, targetBounds.left) - 5;
    const maxX = Math.max(draggedBounds.right, targetBounds.right) + 5;
    
    const start = new THREE.Vector3(minX, y, 0.1);
    const end = new THREE.Vector3(maxX, y, 0.1);
    
    const guideLine = createGuideLine(start, end, 0xff00ff);
    scene.add(guideLine);
    activeGuideLines.push(guideLine);
  }
}

/**
 * Clear all alignment guide lines
 */
export function clearAlignmentGuides(scene: THREE.Scene) {
  activeGuideLines.forEach(line => {
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  });
  activeGuideLines = [];
}

/**
 * Check if an object is an alignment guide
 */
export function isAlignmentGuide(object: THREE.Object3D): boolean {
  return !!(object as any).isAlignmentGuide;
}
