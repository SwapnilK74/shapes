// src/drawing/measurements/snapIndicator.ts
import * as THREE from 'three';


// Define SnapPoint locally to avoid circular import
interface SnapPoint {
  position: THREE.Vector3;
  type: string;
}


let snapIndicatorMesh: THREE.Mesh | THREE.Group | null = null; 


/**
 * Get snap color based on snap type
 */
function getSnapColor(snapType: string): number {
  switch (snapType) {
    case 'endpoint':
      return 0X3396D3; 
    case 'midpoint':
      return 0xFFB823;
    case 'center':
      return 0xff00ff; // Magenta
    case 'edge':
      return 0x2D4F2B;
    case 'intersection':
      return 0x2D4F2B;
    default:
      return 0x00ffff; 
  }
}


/**
 * Create a ring geometry for endpoint/vertex snaps
 */
function createRingIndicator(color: number): THREE.Mesh {
  const snapIndicatorSize = 0.15;
  const geometry = new THREE.RingGeometry(
    snapIndicatorSize * 0.7,
    snapIndicatorSize,
    32
  );
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthTest: false
  });

  return new THREE.Mesh(geometry, material);
}


/**
 * Create a box geometry for midpoint/center snaps
 */
function createBoxIndicator(color: number): THREE.Mesh {
  const boxSize = 0.2;
  const geometry = new THREE.BoxGeometry(boxSize, boxSize, 0.01);
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthTest: false
  });

  return new THREE.Mesh(geometry, material);
}


/**
 * Create an X geometry using two rotated rectangles for edge snaps
 */
function createXIndicator(color: number): THREE.Group {
  const group = new THREE.Group();
  const xSize = 0.2;
  const thickness = 0.03; // Thickness of each bar
  
  // Create geometry for one bar of the X
  const barGeometry = new THREE.BoxGeometry(xSize, thickness, 0.01);
  
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthTest: false
  });

  // First diagonal bar (rotated 45 degrees)
  const bar1 = new THREE.Mesh(barGeometry, material);
  bar1.rotation.z = Math.PI / 4; // 45 degrees
  
  // Second diagonal bar (rotated -45 degrees)
  const bar2 = new THREE.Mesh(barGeometry.clone(), material.clone());
  bar2.rotation.z = -Math.PI / 4; // -45 degrees
  
  group.add(bar1);
  group.add(bar2);
  
  return group;
}


/**
 * Shows or hides the snap indicator based on snap type
 */
export function updateSnapIndicator(
  snapPoint: SnapPoint | null,
  scene: THREE.Scene
) {
  // Remove existing indicator
  if (snapIndicatorMesh) {
    scene.remove(snapIndicatorMesh);
    
    // Dispose geometries and materials
    snapIndicatorMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    snapIndicatorMesh = null;
  }

  // No snap point - hide indicator
  if (!snapPoint) {
    return;
  }

  const color = getSnapColor(snapPoint.type);
  
  // Create appropriate geometry based on snap type
  switch (snapPoint.type) {
    case 'endpoint':
    case 'vertex':
    case 'intersection':
      snapIndicatorMesh = createRingIndicator(color);
      break;
      
    case 'midpoint':
    case 'center':
      snapIndicatorMesh = createBoxIndicator(color);
      break;
      
    case 'edge':
      snapIndicatorMesh = createXIndicator(color);
      break;
      
    default:
      snapIndicatorMesh = createRingIndicator(color);
  }

  snapIndicatorMesh.position.copy(snapPoint.position);
  snapIndicatorMesh.renderOrder = 999;
  
  // Mark as UI-only element
  (snapIndicatorMesh as any).isUiOnly = true;
  
  scene.add(snapIndicatorMesh);
}


/**
 * Clean up snap indicator
 */
export function disposeSnapIndicator(scene: THREE.Scene) {
  if (snapIndicatorMesh) {
    scene.remove(snapIndicatorMesh);
    
    snapIndicatorMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    snapIndicatorMesh = null;
  }
}
