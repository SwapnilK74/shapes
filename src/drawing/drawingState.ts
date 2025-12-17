// src/drawing/drawingState.ts
export type ShapeTool = 'select' | 'plane' | 'circle' | 'triangle' | 'line';

let currentTool: ShapeTool = 'select';
let snapEnabled = false;

export function setShapeTool(tool: ShapeTool) {
  currentTool = tool;
}

export function getShapeTool(): ShapeTool {
  return currentTool;
}

export function setSnapEnabled(value: boolean) {
  snapEnabled = value;
}
export function isSnapEnabled() {
  return snapEnabled;
}