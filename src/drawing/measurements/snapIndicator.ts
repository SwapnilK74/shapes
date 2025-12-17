// src/drawing/measurements/snapIndicator.ts
import * as THREE from 'three';

// Define SnapPoint locally to avoid circular import
interface SnapPoint {
  position: THREE.Vector3;
  type: string;
}

let snapIndicatorCircle: THREE.Mesh | null = null;

/**
 * Get snap color based on snap type
 */
function getSnapColor(snapType: string): number {
  // Default colors for different snap types
  switch (snapType) {
    case 'endpoint':
      return 0x00ff00; // Green
    case 'midpoint':
      return 0xffff00; // Yellow
    case 'center':
      return 0xff00ff; // Magenta
    case 'edge':
      return 0x008000;
    case 'intersection':
      return 0x00ffff; // Cyan
    default:
      return 0x00ffff; // Cyan fallback
  }
}

/**
 * Shows or hides the snap indicator circle (flat ring that faces camera)
 */
export function updateSnapIndicator(
  snapPoint: SnapPoint | null,
  scene: THREE.Scene
) {
  // Remove existing indicator
  if (snapIndicatorCircle) {
    scene.remove(snapIndicatorCircle);
  }

  // No snap point - hide indicator
  if (!snapPoint) {
    snapIndicatorCircle = null;
    return;
  }

  // Create flat circle geometry (ring shape)
  const snapIndicatorSize = 0.15; // Circle radius
  const geometry = new THREE.RingGeometry(
    snapIndicatorSize * 0.7,  // Inner radius (creates hollow circle)
    snapIndicatorSize,         // Outer radius
    32                          // Segments (smoothness)
  );
  
  const material = new THREE.MeshBasicMaterial({
    color: getSnapColor(snapPoint.type),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthTest: false
  });

  snapIndicatorCircle = new THREE.Mesh(geometry, material);
  snapIndicatorCircle.position.copy(snapPoint.position);
  snapIndicatorCircle.renderOrder = 999;
  
  // ✅ REMOVED camera billboard - circle just stays flat on Z plane
  // This is simpler and works fine for 2D CAD view
  
  // Mark as UI-only element
  (snapIndicatorCircle as any).isUiOnly = true;
  
  scene.add(snapIndicatorCircle);
}

/**
 * Clean up snap indicator
 */
export function disposeSnapIndicator(scene: THREE.Scene) {
  if (snapIndicatorCircle) {
    scene.remove(snapIndicatorCircle);
    snapIndicatorCircle.geometry.dispose();
    (snapIndicatorCircle.material as THREE.Material).dispose();
    snapIndicatorCircle = null;
  }
}
