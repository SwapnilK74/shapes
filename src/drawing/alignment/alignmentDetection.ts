// src/drawing/alignment/alignmentDetection.ts
import * as THREE from 'three';


export type AlignmentType = 
  | 'center-x'      // Vertical line through centers
  | 'center-y'      // Horizontal line through centers
  | 'edge-left'     // Left edges align
  | 'edge-right'    // Right edges align
  | 'edge-top'      // Top edges align
  | 'edge-bottom'   // Bottom edges align
  | 'edge-left-to-right'   // ✅ NEW: Shape1 left aligns with Shape2 right
  | 'edge-right-to-left'   // ✅ NEW: Shape1 right aligns with Shape2 left
  | 'edge-top-to-bottom'   // ✅ NEW: Shape1 top aligns with Shape2 bottom
  | 'edge-bottom-to-top';  // ✅ NEW: Shape1 bottom aligns with Shape2 top


export interface AlignmentCandidate {
  type: AlignmentType;
  targetShape: THREE.Mesh;
  alignmentValue: number; // X or Y coordinate of alignment
  distance: number;       // How far dragged shape is from alignment
}


export interface ShapeBounds {
  mesh: THREE.Mesh;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}


/**
 * Get bounding box info for a shape
 */
export function getShapeBounds(mesh: THREE.Mesh): ShapeBounds {
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox!;
  
  // Get corners in local space
  const localCorners = [
    new THREE.Vector3(bbox.min.x, bbox.min.y, 0),
    new THREE.Vector3(bbox.max.x, bbox.min.y, 0),
    new THREE.Vector3(bbox.max.x, bbox.max.y, 0),
    new THREE.Vector3(bbox.min.x, bbox.max.y, 0),
  ];
  
  const worldCorners = localCorners.map(corner => {
    const worldCorner = corner.clone();
    worldCorner.multiply(mesh.scale);
    worldCorner.applyQuaternion(mesh.quaternion);
    worldCorner.add(mesh.position);
    return worldCorner;
  });

  const xs = worldCorners.map(c => c.x);
  const ys = worldCorners.map(c => c.y);
  
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const bottom = Math.min(...ys);
  const top = Math.max(...ys);
  
  return {
    mesh,
    centerX: mesh.position.x,
    centerY: mesh.position.y,
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: top - bottom,
  };
}


/**
 * Find all alignment candidates for a dragging shape
 */
export function findAlignmentCandidates(
  draggedShape: THREE.Mesh,
  allShapes: THREE.Mesh[],
  snapThreshold: number = 0.5
): AlignmentCandidate[] {
  const candidates: AlignmentCandidate[] = [];
  const draggedBounds = getShapeBounds(draggedShape);
  
  for (const targetShape of allShapes) {
    // Skip self
    if (targetShape.uuid === draggedShape.uuid) continue;
    
    const targetBounds = getShapeBounds(targetShape);
    
    // ===== CENTER ALIGNMENTS =====
    
    // Check center X alignment (vertical guide line)
    const centerXDist = Math.abs(draggedBounds.centerX - targetBounds.centerX);
    if (centerXDist < snapThreshold) {
      candidates.push({
        type: 'center-x',
        targetShape,
        alignmentValue: targetBounds.centerX,
        distance: centerXDist,
      });
    }
    
    // Check center Y alignment (horizontal guide line)
    const centerYDist = Math.abs(draggedBounds.centerY - targetBounds.centerY);
    if (centerYDist < snapThreshold) {
      candidates.push({
        type: 'center-y',
        targetShape,
        alignmentValue: targetBounds.centerY,
        distance: centerYDist,
      });
    }
    
    // ===== SAME-EDGE ALIGNMENTS =====
    
    // Check left edge alignment
    const leftDist = Math.abs(draggedBounds.left - targetBounds.left);
    if (leftDist < snapThreshold) {
      candidates.push({
        type: 'edge-left',
        targetShape,
        alignmentValue: targetBounds.left,
        distance: leftDist,
      });
    }
    
    // Check right edge alignment
    const rightDist = Math.abs(draggedBounds.right - targetBounds.right);
    if (rightDist < snapThreshold) {
      candidates.push({
        type: 'edge-right',
        targetShape,
        alignmentValue: targetBounds.right,
        distance: rightDist,
      });
    }
    
    // Check top edge alignment
    const topDist = Math.abs(draggedBounds.top - targetBounds.top);
    if (topDist < snapThreshold) {
      candidates.push({
        type: 'edge-top',
        targetShape,
        alignmentValue: targetBounds.top,
        distance: topDist,
      });
    }
    
    // Check bottom edge alignment
    const bottomDist = Math.abs(draggedBounds.bottom - targetBounds.bottom);
    if (bottomDist < snapThreshold) {
      candidates.push({
        type: 'edge-bottom',
        targetShape,
        alignmentValue: targetBounds.bottom,
        distance: bottomDist,
      });
    }
    
    // ===== ✅ NEW: ADJACENT-EDGE ALIGNMENTS =====
    
    // Left-to-Right: dragged left edge aligns with target right edge
    const leftToRightDist = Math.abs(draggedBounds.left - targetBounds.right);
    if (leftToRightDist < snapThreshold) {
      candidates.push({
        type: 'edge-left-to-right',
        targetShape,
        alignmentValue: targetBounds.right,
        distance: leftToRightDist,
      });
    }
    
    // Right-to-Left: dragged right edge aligns with target left edge
    const rightToLeftDist = Math.abs(draggedBounds.right - targetBounds.left);
    if (rightToLeftDist < snapThreshold) {
      candidates.push({
        type: 'edge-right-to-left',
        targetShape,
        alignmentValue: targetBounds.left,
        distance: rightToLeftDist,
      });
    }
    
    // Top-to-Bottom: dragged top edge aligns with target bottom edge
    const topToBottomDist = Math.abs(draggedBounds.top - targetBounds.bottom);
    if (topToBottomDist < snapThreshold) {
      candidates.push({
        type: 'edge-top-to-bottom',
        targetShape,
        alignmentValue: targetBounds.bottom,
        distance: topToBottomDist,
      });
    }
    
    // Bottom-to-Top: dragged bottom edge aligns with target top edge
    const bottomToTopDist = Math.abs(draggedBounds.bottom - targetBounds.top);
    if (bottomToTopDist < snapThreshold) {
      candidates.push({
        type: 'edge-bottom-to-top',
        targetShape,
        alignmentValue: targetBounds.top,
        distance: bottomToTopDist,
      });
    }
  }
  
  // Sort by distance (closest first)
  candidates.sort((a, b) => a.distance - b.distance);
  
  return candidates;
}


/**
 * Get best alignment from candidates (one vertical, one horizontal max)
 */
export function getBestAlignments(
  candidates: AlignmentCandidate[]
): { horizontal: AlignmentCandidate | null; vertical: AlignmentCandidate | null } {
  let horizontal: AlignmentCandidate | null = null;
  let vertical: AlignmentCandidate | null = null;
  
  for (const candidate of candidates) {
    // Vertical guide lines (center-x, edge-left, edge-right, left-to-right, right-to-left)
    if (!vertical && (
      candidate.type === 'center-x' || 
      candidate.type === 'edge-left' || 
      candidate.type === 'edge-right' ||
      candidate.type === 'edge-left-to-right' ||  // ✅ NEW
      candidate.type === 'edge-right-to-left'      // ✅ NEW
    )) {
      vertical = candidate;
    }
    
    // Horizontal guide lines (center-y, edge-top, edge-bottom, top-to-bottom, bottom-to-top)
    if (!horizontal && (
      candidate.type === 'center-y' || 
      candidate.type === 'edge-top' || 
      candidate.type === 'edge-bottom' ||
      candidate.type === 'edge-top-to-bottom' ||   // ✅ NEW
      candidate.type === 'edge-bottom-to-top'      // ✅ NEW
    )) {
      horizontal = candidate;
    }
    
    // Found both, stop
    if (horizontal && vertical) break;
  }
  
  return { horizontal, vertical };
}
