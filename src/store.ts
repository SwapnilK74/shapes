// src/store.ts
import { create } from 'zustand';

interface StoreState {
  // Shape settings
  defaultFillColor: string;
  defaultOutlineColor: string;
  
  // Selection state
  selectedShapeId: string | null;
  activeMeasurementId: string | null;
  
  // Measurement settings
  measurementSettings: {
    // Line colors (hex strings for UI, convert to numbers for THREE.js)
    dimensionLineColor: string;
    dimensionLineColorSelected: string;
    extensionLineColor: string;
    extensionLineColorSelected: string;
    
    // Line widths
    dimensionLineWidth: number;
    extensionLineWidth: number;
    
    // Arrow settings
    arrowSize: number;
    arrowStyle: 'filled' | 'open' | 'none';
    
    // Extension settings
    extensionOverhang: number;

    // Circle settings
    circleColor: string;
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
  };
  
  // Actions - Shape
  setDefaultFillColor: (color: string) => void;
  setDefaultOutlineColor: (color: string) => void;
  
  // Actions - Selection
  setSelectedShapeId: (id: string | null) => void;
  setActiveMeasurementId: (id: string | null) => void;
  
  // Actions - Measurement
  setMeasurementDimensionLineColor: (color: string) => void;
  setMeasurementExtensionLineColor: (color: string) => void;
  setMeasurementArrowSize: (size: number) => void;
  setMeasurementArrowStyle: (style: 'filled' | 'open' | 'none') => void;
  setMeasurementExtensionOverhang: (overhang: number) => void;
  setMeasurementLabelFontSize: (size: number) => void;
  setMeasurementDefaultOffset: (offset: number) => void;
  setMeasurementLabelBackgroundOpacity: (opacity: number) => void;
 setMeasurementLabelBackgroundColor: (color: string) => void;
  setMeasurementLabelTextColor: (color: string) => void;
  
  
  // Actions - Circle
  setMeasurementCircleColor: (color: string) => void;
  setMeasurementCircleSize: (size: number) => void;
  setMeasurementShowCircles: (show: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  // Shape settings
  defaultFillColor: '#00ff88',
  defaultOutlineColor: '#ffffff',
  
  // Selection state
  selectedShapeId: null,
  activeMeasurementId: null,
  
  // Measurement settings
  measurementSettings: {
    dimensionLineColor: '#FFBF78',
    dimensionLineColorSelected: '#ffaa00',
    extensionLineColor: '#ff6600',
    extensionLineColorSelected: '#ffff00',
    
    dimensionLineWidth: 3,
    extensionLineWidth: 2,
    
    arrowSize: 0.15,
    arrowStyle: 'filled',
    
    extensionOverhang: 0.2,
    
    // Circle settings
    circleColor: '#ff8800',
    circleSize: 0.08,
    showCircles: true,
    
    labelBackgroundColor: 'rgb(245, 231, 198)',
    labelBackgroundColorSelected: 'rgb(255, 170, 0)',
    labelBackgroundOpacity: 0.9,
    labelTextColor: 'black',
    labelTextColorSelected: 'white',
    labelFontSize: 12,
    labelFontFamily: 'monospace',
    labelPadding: '4px 8px',
    labelBorderRadius: '4px',
    
    defaultDimensionOffset: 0.2,
  },
  
  // Shape actions
  setDefaultFillColor: (color) => set({ defaultFillColor: color }),
  setDefaultOutlineColor: (color) => set({ defaultOutlineColor: color }),
  
  // Selection actions
  setSelectedShapeId: (id) => set({ selectedShapeId: id }),
  setActiveMeasurementId: (id) => set({ activeMeasurementId: id }),
  
  // Measurement actions
  setMeasurementDimensionLineColor: (color) =>
    set((state) => ({
      measurementSettings: { 
        ...state.measurementSettings, 
        dimensionLineColor: color,
        dimensionLineColorSelected: color 
      }
    })),
  
  setMeasurementExtensionLineColor: (color) =>
    set((state) => ({
      measurementSettings: { 
        ...state.measurementSettings, 
        extensionLineColor: color,
        extensionLineColorSelected: color 
      }
    })),
  
  setMeasurementArrowSize: (size) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, arrowSize: size }
    })),
  
  setMeasurementArrowStyle: (style) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, arrowStyle: style }
    })),
  
  setMeasurementExtensionOverhang: (overhang) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, extensionOverhang: overhang }
    })),
  
  setMeasurementLabelFontSize: (size) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, labelFontSize: size }
    })),

    setMeasurementLabelBackgroundOpacity: (opacity) => 
      set((state) => ({
        measurementSettings: {
          ...state.measurementSettings,
          labelBackgroundOpacity: Math.max(0, Math.min(1, opacity))
        }
      })),

        setMeasurementLabelBackgroundColor: (color) =>
    set((state) => ({
      measurementSettings: { 
        ...state.measurementSettings, 
        labelBackgroundColor: color 
      }
    })),
  
  setMeasurementLabelTextColor: (color) =>
    set((state) => ({
      measurementSettings: { 
        ...state.measurementSettings, 
        labelTextColor: color 
      }
    })),
  
  setMeasurementDefaultOffset: (offset) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, defaultDimensionOffset: offset }
    })),
  
  // Circle actions
  setMeasurementCircleColor: (color) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, circleColor: color }
    })),
  
  setMeasurementCircleSize: (size) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, circleSize: size }
    })),
  
  setMeasurementShowCircles: (show) =>
    set((state) => ({
      measurementSettings: { ...state.measurementSettings, showCircles: show }
    })),
}));

// Helper: Convert "#00ff88" to 0x00ff88
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// Helper: Convert 0x00ff88 to "#00ff88"
export function numberToHex(num: number): string {
  return '#' + num.toString(16).padStart(6, '0');
}
