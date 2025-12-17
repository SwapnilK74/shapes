// src/drawing/dimensions/dimensionSettings.ts
export type ArrowStyle = 'filled' | 'open' | 'none'; // Keep types for future

const ARROW_STYLE: ArrowStyle = 'filled'; // Global constant

export function getArrowStyle(): ArrowStyle {
  return ARROW_STYLE;
}
