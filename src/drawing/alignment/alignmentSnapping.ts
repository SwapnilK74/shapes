// src/drawing/alignment/alignmentSnapping.ts
import * as THREE from 'three';
import type { AlignmentCandidate } from './alignmentDetection';
import { getShapeBounds } from './alignmentDetection';


/**
 * Apply alignment snapping to a dragged shape's position
 * Returns the snapped position
 */
export function applyAlignmentSnap(
  draggedShape: THREE.Mesh,
  desiredPosition: THREE.Vector3,
  horizontalAlignment: AlignmentCandidate | null,
  verticalAlignment: AlignmentCandidate | null
): THREE.Vector3 {
  const snappedPosition = desiredPosition.clone();
  const draggedBounds = getShapeBounds(draggedShape);
  
  // Calculate offset from shape center to its position
  const centerOffsetX = draggedShape.position.x - draggedBounds.centerX;
  const centerOffsetY = draggedShape.position.y - draggedBounds.centerY;
  
  // Apply vertical alignment (affects X coordinate)
  if (verticalAlignment) {
    const targetX = verticalAlignment.alignmentValue;
    
    switch (verticalAlignment.type) {
      case 'center-x':
        // Align centers
        snappedPosition.x = targetX + centerOffsetX;
        break;
        
      case 'edge-left':
        // Align left edges
        snappedPosition.x = targetX + (draggedShape.position.x - draggedBounds.left);
        break;
        
      case 'edge-right':
        // Align right edges
        snappedPosition.x = targetX + (draggedShape.position.x - draggedBounds.right);
        break;
        
      // ✅ NEW: Adjacent edge alignments
      case 'edge-left-to-right':
        // Dragged left edge aligns with target right edge
        snappedPosition.x = targetX + (draggedShape.position.x - draggedBounds.left);
        break;
        
      case 'edge-right-to-left':
        // Dragged right edge aligns with target left edge
        snappedPosition.x = targetX + (draggedShape.position.x - draggedBounds.right);
        break;
    }
  }
  
  // Apply horizontal alignment (affects Y coordinate)
  if (horizontalAlignment) {
    const targetY = horizontalAlignment.alignmentValue;
    
    switch (horizontalAlignment.type) {
      case 'center-y':
        // Align centers
        snappedPosition.y = targetY + centerOffsetY;
        break;
        
      case 'edge-top':
        // Align top edges
        snappedPosition.y = targetY + (draggedShape.position.y - draggedBounds.top);
        break;
        
      case 'edge-bottom':
        // Align bottom edges
        snappedPosition.y = targetY + (draggedShape.position.y - draggedBounds.bottom);
        break;
        
      // ✅ NEW: Adjacent edge alignments
      case 'edge-top-to-bottom':
        // Dragged top edge aligns with target bottom edge
        snappedPosition.y = targetY + (draggedShape.position.y - draggedBounds.top);
        break;
        
      case 'edge-bottom-to-top':
        // Dragged bottom edge aligns with target top edge
        snappedPosition.y = targetY + (draggedShape.position.y - draggedBounds.bottom);
        break;
    }
  }
  
  return snappedPosition;
}


/**
 * Calculate snap offset for a single axis
 * Used for more granular control
 */
export function calculateSnapOffset(
  currentValue: number,
  targetValue: number,
  snapThreshold: number
): number {
  const distance = Math.abs(currentValue - targetValue);
  
  if (distance < snapThreshold) {
    return targetValue - currentValue;
  }
  
  return 0;
}


/**
 * Check if position should snap
 */
export function shouldSnap(
  currentValue: number,
  targetValue: number,
  snapThreshold: number
): boolean {
  return Math.abs(currentValue - targetValue) < snapThreshold;
}
