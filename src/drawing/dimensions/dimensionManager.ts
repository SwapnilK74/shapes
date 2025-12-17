// src/drawing/dimensions/dimensionManager.ts
import * as THREE from 'three';




export type UnitSystem = 'metric' | 'imperial';
export type ArrowStyle = 'none' | 'filled' | 'open';

export interface DimensionLine {
  id: string;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  color: number;
  lineObject: THREE.Line | null;
  arrowObjects: THREE.Mesh[]; 
}

export interface DimensionLabel {
  id: string;
  worldPosition: THREE.Vector3;
  text: string;
  htmlElement: HTMLDivElement | null;
}


let activeDimensionLines: DimensionLine[] = [];
let activeDimensionLabels: DimensionLabel[] = [];
let currentUnitSystem: UnitSystem = 'metric';
let currentArrowStyle: ArrowStyle = 'filled';



export function getActiveDimensionLines(): DimensionLine[] {
  return activeDimensionLines;
}

export function getActiveDimensionLabels(): DimensionLabel[] {
  return activeDimensionLabels;
}

export function getCurrentUnitSystem(): UnitSystem {
  return currentUnitSystem;
}

export function getCurrentArrowStyle(): ArrowStyle {
  return currentArrowStyle;
}


export function setUnitSystem(unit: UnitSystem) {
  currentUnitSystem = unit;
}

export function setArrowStyle(style: ArrowStyle) {
  currentArrowStyle = style;
}

export function addDimensionLine(line: DimensionLine) {
  activeDimensionLines.push(line);
}

export function addDimensionLabel(label: DimensionLabel) {
  activeDimensionLabels.push(label);
}



export function clearAllDimensions() {
  
  for (const dimensionLine of activeDimensionLines) {
    if (dimensionLine.lineObject && dimensionLine.lineObject.parent) {
      dimensionLine.lineObject.parent.remove(dimensionLine.lineObject);
    }
    
   
    for (const arrowMesh of dimensionLine.arrowObjects) {
      if (arrowMesh.parent) {
        arrowMesh.parent.remove(arrowMesh);
      }
    }
  }

 
  for (const dimensionLabel of activeDimensionLabels) {
    if (dimensionLabel.htmlElement && dimensionLabel.htmlElement.parentNode) {
      dimensionLabel.htmlElement.parentNode.removeChild(dimensionLabel.htmlElement);
    }
  }

 
  activeDimensionLines = [];
  activeDimensionLabels = [];
}


let dimensionIdCounter = 0;

export function generateDimensionId(): string {
  dimensionIdCounter++;
  return `dimension-${dimensionIdCounter}`;
}
