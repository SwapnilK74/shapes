// src/drawing/measurements/measurementSettings.ts
import { useStore, hexToNumber } from '../../store';

export type ArrowStyle = 'filled' | 'open' | 'none';

export interface MeasurementSettingsConfig {
  // Line colors (as THREE.js numbers)
  dimensionLineColor: number;
  dimensionLineColorSelected: number;
  extensionLineColor: number;
  extensionLineColorSelected: number;
  
  // Line widths
  dimensionLineWidth: number;
  extensionLineWidth: number;
  
  // Arrow settings
  arrowSize: number;
  arrowStyle: ArrowStyle;
  
  // Extension line settings
  extensionOverhang: number;

  // Circle settings
  circleColor: number;
  circleSize: number;
  showCircles: boolean;
  
  // Label settings
  labelBackgroundColor: string;
  labelBackgroundColorSelected: string;
  labelBackgroundOpacity: number;
  labelTextColor: string;
  labelTextColorSelected: string;
  labelFontSize: number;
  labelFontFamily: string;
  labelPadding: string;
  labelBorderRadius: string;

  // Default offset
  defaultDimensionOffset: number;
}

// Getters - Read from Zustand store
export function getMeasurementSettings(): MeasurementSettingsConfig {
  const settings = useStore.getState().measurementSettings;
  
  // Convert hex strings to THREE.js numbers for colors
  return {
    dimensionLineColor: hexToNumber(settings.dimensionLineColor),
    dimensionLineColorSelected: hexToNumber(settings.dimensionLineColorSelected),
    extensionLineColor: hexToNumber(settings.extensionLineColor),
    extensionLineColorSelected: hexToNumber(settings.extensionLineColorSelected),
    
    dimensionLineWidth: settings.dimensionLineWidth,
    extensionLineWidth: settings.extensionLineWidth,
    
    arrowSize: settings.arrowSize,
    arrowStyle: settings.arrowStyle,
    
    extensionOverhang: settings.extensionOverhang,

   
    circleColor: hexToNumber(settings.circleColor),
    circleSize: settings.circleSize,
    showCircles: settings.showCircles,
    
    labelBackgroundColor: settings.labelBackgroundColor,
    labelBackgroundColorSelected: settings.labelBackgroundColorSelected,
    labelBackgroundOpacity: settings.labelBackgroundOpacity,
    labelTextColor: settings.labelTextColor,
    labelTextColorSelected: settings.labelTextColorSelected,
    labelFontSize: settings.labelFontSize,
    labelFontFamily: settings.labelFontFamily,
    labelPadding: settings.labelPadding,
    labelBorderRadius: settings.labelBorderRadius,
    
    defaultDimensionOffset: settings.defaultDimensionOffset,
  };
}

export function getMeasurementArrowStyle(): ArrowStyle {
  return useStore.getState().measurementSettings.arrowStyle;
}

// Individual setters - Update Zustand store
export function setDimensionLineColor(color: number) {
  const hexColor = '#' + color.toString(16).padStart(6, '0');
  useStore.getState().setMeasurementDimensionLineColor(hexColor);
}

export function setDimensionLineColorSelected(color: number) {
  const hexColor = '#' + color.toString(16).padStart(6, '0');
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      dimensionLineColorSelected: hexColor
    }
  }));
}

export function setExtensionLineColor(color: number) {
  const hexColor = '#' + color.toString(16).padStart(6, '0');
  useStore.getState().setMeasurementExtensionLineColor(hexColor);
}

export function setExtensionLineColorSelected(color: number) {
  const hexColor = '#' + color.toString(16).padStart(6, '0');
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      extensionLineColorSelected: hexColor
    }
  }));
}

export function setDimensionLineWidth(width: number) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      dimensionLineWidth: Math.max(1, width)
    }
  }));
}

export function setExtensionLineWidth(width: number) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      extensionLineWidth: Math.max(1, width)
    }
  }));
}

export function setArrowSize(size: number) {
  useStore.getState().setMeasurementArrowSize(Math.max(0.05, size));
}

export function setArrowStyle(style: ArrowStyle) {
  useStore.getState().setMeasurementArrowStyle(style);
}

export function setExtensionOverhang(overhang: number) {
  useStore.getState().setMeasurementExtensionOverhang(Math.max(0, overhang));
}

export function setLabelBackgroundColor(color: string) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      labelBackgroundColor: color
    }
  }));
}


export function setCircleColor(color: number): void {
  const hexColor = '#' + color.toString(16).padStart(6, '0');
  useStore.getState().setMeasurementCircleColor(hexColor);
}

export function getCircleColor(): number {
  return hexToNumber(useStore.getState().measurementSettings.circleColor);
}

export function setCircleSize(size: number): void {
  useStore.getState().setMeasurementCircleSize(size);
}

export function getCircleSize(): number {
  return useStore.getState().measurementSettings.circleSize;
}

export function setShowCircles(show: boolean): void {
  useStore.getState().setMeasurementShowCircles(show);
}

export function getShowCircles(): boolean {
  return useStore.getState().measurementSettings.showCircles;
}

export function setLabelBackgroundColorSelected(color: string) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      labelBackgroundColorSelected: color
    }
  }));
}

export function setLabelBackgroundOpacity(opacity: number) {
  useStore.getState().setMeasurementLabelBackgroundOpacity(opacity);
}

export function setLabelTextColor(color: string) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      labelTextColor: color
    }
  }));
}

export function setLabelTextColorSelected(color: string) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      labelTextColorSelected: color
    }
  }));
}

export function setLabelFontSize(size: number) {
  useStore.getState().setMeasurementLabelFontSize(Math.max(8, Math.min(32, size)));
}

export function setLabelFontFamily(family: string) {
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      labelFontFamily: family
    }
  }));
}

export function setDefaultDimensionOffset(offset: number) {
  useStore.getState().setMeasurementDefaultOffset(Math.max(0, offset));
}

// Bulk update
export function updateMeasurementSettings(partial: Partial<MeasurementSettingsConfig>) {
  const current = useStore.getState().measurementSettings;
  
  // Convert any number colors to hex strings
  const updates: any = {};
  
  Object.keys(partial).forEach(key => {
    const value = (partial as any)[key];
    
    // Convert number colors to hex strings
    if (key.includes('Color') && typeof value === 'number') {
      updates[key] = '#' + value.toString(16).padStart(6, '0');
    } else {
      updates[key] = value;
    }
  });
  
  useStore.setState((state) => ({
    measurementSettings: {
      ...state.measurementSettings,
      ...updates
    }
  }));
}

// Helper to convert hex color to CSS rgba
export function hexToRgba(hex: number, alpha: number = 1): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to convert CSS color to hex number
export function cssColorToHex(cssColor: string): number {
  // Create temporary element to parse CSS color
  const tempDiv = document.createElement('div');
  tempDiv.style.color = cssColor;
  document.body.appendChild(tempDiv);
  
  const computedColor = window.getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);
  
  // Extract RGB values
  const match = computedColor.match(/\d+/g);
  if (!match || match.length < 3) return 0x00ffff;
  
  const r = parseInt(match[0]);
  const g = parseInt(match[1]);
  const b = parseInt(match[2]);
  
  return (r << 16) | (g << 8) | b;
}
