// src/components/MeasurementSettings.tsx
import React, { useState, useEffect } from 'react';
import {
  setArrowSize,
  setExtensionOverhang,
  setDefaultDimensionOffset,
} from '../drawing/measurements/measurementSettings';
import { 
 deleteMeasurementById,
  refreshAllMeasurements, 
} from '../drawing/measurements/measurementInteraction';
import { 
  getMeasurementById,
  updateMeasurementColors,
  updateMeasurementArrowSettings,
  updateMeasurementExtensionOverhang,
  updateMeasurementLabelSettings,
  updateMeasurementCircleSettings,
  getAllMeasurements
} from '../drawing/measurements/measurementManager';

import { 
  updateMeasurementColors as updateVisualColors,
  updateMeasurementCircleGeometry,
  updateMeasurementCircleVisibility
} from '../drawing/measurements/measurementRenderer';


import { useStore } from '../store';
import './MeasurementSettings.css';

interface MeasurementSettingsProps {
  isVisible: boolean;
  onClose: () => void;
}

const MeasurementSettings: React.FC<MeasurementSettingsProps> = ({ isVisible, onClose }) => {
  const activeMeasurementId = useStore((state) => state.activeMeasurementId);
  const activeMeasurement = activeMeasurementId ? getMeasurementById(activeMeasurementId) : null;
  
  // Get defaults from store
  const defaultDimensionColor = useStore((state) => state.measurementSettings.dimensionLineColor);
  const defaultExtensionColor = useStore((state) => state.measurementSettings.extensionLineColor);
  const defaultLabelBgColor = useStore((state) => state.measurementSettings.labelBackgroundColor);
  const defaultLabelBgOpacity = useStore((state) => state.measurementSettings.labelBackgroundOpacity);
  const defaultLabelTextColor = useStore((state) => state.measurementSettings.labelTextColor);
  const defaultLabelFontSize = useStore((state) => state.measurementSettings.labelFontSize);
  const defaultArrowColor = useStore((state) => state.measurementSettings.arrowColor);
  const defaultArrowSize = useStore((state) => state.measurementSettings.arrowSize);
  const defaultExtensionOverhang = useStore((state) => state.measurementSettings.extensionOverhang);
  const defaultDimensionOffset = useStore((state) => state.measurementSettings.defaultDimensionOffset);
  const defaultCircleColor = useStore((state) => state.measurementSettings.circleColor);
    const defaultCircleSize = useStore((state) => state.measurementSettings.circleSize); 
  const defaultShowCircles = useStore((state) => state.measurementSettings.showCircles); 


  const setMeasurementDimensionLineColor = useStore((state) => state.setMeasurementDimensionLineColor);
  const setMeasurementExtensionLineColor = useStore((state) => state.setMeasurementExtensionLineColor);
  const setMeasurementArrowColor = useStore((state) => state.setMeasurementArrowColor);
  const setMeasurementArrowSizeStore = useStore((state) => state.setMeasurementArrowSize);
  const setMeasurementExtensionOverhangStore = useStore((state) => state.setMeasurementExtensionOverhang);
  const setMeasurementLabelTextColor = useStore((state) => state.setMeasurementLabelTextColor);
  const setMeasurementLabelBgColor = useStore((state) => state.setMeasurementLabelBackgroundColor);
  const setMeasurementLabelFontSize = useStore((state) => state.setMeasurementLabelFontSize);
    const setMeasurementCircleColor = useStore((state) => state.setMeasurementCircleColor); 
  const setMeasurementCircleSize = useStore((state) => state.setMeasurementCircleSize); 
   const setMeasurementShowCircles = useStore((state) => state.setMeasurementShowCircles); 
 const setMeasurementLabelBgOpacity = useStore((state) => state.setMeasurementLabelBackgroundOpacity);

  // State for all settings
  const [dimensionLineColor, setDimensionLineColorState] = useState(defaultDimensionColor);
  const [extensionLineColor, setExtensionLineColorState] = useState(defaultExtensionColor);
  const [arrowColor, setArrowColorState] = useState(defaultArrowColor);
  const [arrowSizeValue, setArrowSizeValue] = useState(defaultArrowSize);
  const [extensionOverhangValue, setExtensionOverhangValue] = useState(defaultExtensionOverhang);
  const [labelBgColor, setLabelBgColorState] = useState(defaultLabelBgColor);
  const [labelBgOpacity, setLabelBgOpacityState] = useState(defaultLabelBgOpacity);
  const [labelTextColor, setLabelTextColorState] = useState(defaultLabelTextColor);
  const [labelFontSize, setLabelFontSizeState] = useState(defaultLabelFontSize);
  // const [dimensionOffset, setDimensionOffsetState] = useState(0);
  const [defaultOffset, setDefaultOffsetState] = useState(defaultDimensionOffset);

  const [circleColor, setCircleColorState] = useState(defaultCircleColor); 
  const [circleSize, setCircleSizeState] = useState(defaultCircleSize); 
  const [showCircles, setShowCirclesState] = useState(defaultShowCircles); 

  // Update state when active measurement changes
  useEffect(() => {
    if (activeMeasurement) {
      setDimensionLineColorState(activeMeasurement.dimensionLineColor);
      setExtensionLineColorState(activeMeasurement.extensionLineColor);
      setArrowColorState(activeMeasurement.arrowColor);
      setArrowSizeValue(activeMeasurement.arrowSize);
      setExtensionOverhangValue(activeMeasurement.extensionOverhang);
      setLabelBgColorState(activeMeasurement.labelBackgroundColor);
      setLabelBgOpacityState(activeMeasurement.labelBackgroundOpacity ?? 0.9);
      setLabelTextColorState(activeMeasurement.labelTextColor);
      setLabelFontSizeState(activeMeasurement.labelFontSize);
      // setDimensionOffsetState(activeMeasurement.dimensionOffset);
            setCircleColorState(activeMeasurement.circleColor);
      setCircleSizeState(activeMeasurement.circleSize);
      setShowCirclesState(activeMeasurement.showCircles); 
    }
  }, [activeMeasurementId, activeMeasurement]);

  if (!isVisible || !activeMeasurement) return null;

  // ✅ LIVE RENDERING - Call refreshAllMeasurements() after each update!
  const handleDimensionColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setDimensionLineColorState(color);
    updateMeasurementColors(activeMeasurement.id, { dimensionLineColor: color });
    setMeasurementDimensionLineColor(color);
    updateVisualColors(activeMeasurement.id);
    refreshAllMeasurements(); 
  };

  const handleExtensionColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setExtensionLineColorState(color);
    updateMeasurementColors(activeMeasurement.id, { extensionLineColor: color });
    setMeasurementExtensionLineColor(color);
    updateVisualColors(activeMeasurement.id);
    refreshAllMeasurements(); 
  };

  const handleArrowColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setArrowColorState(color);
    updateMeasurementColors(activeMeasurement.id, { arrowColor: color});
    setMeasurementArrowColor(color);
    updateVisualColors(activeMeasurement.id);
    refreshAllMeasurements();
  }

  const handleArrowSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseFloat(e.target.value);
    setArrowSizeValue(size);
    updateMeasurementArrowSettings(activeMeasurement.id, { arrowSize: size });
    setArrowSize(size);
    setMeasurementArrowSizeStore(size);
    refreshAllMeasurements(); 
  };

  const handleExtensionOverhangChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const overhang = parseFloat(e.target.value);
    setExtensionOverhangValue(overhang);
    updateMeasurementExtensionOverhang(activeMeasurement.id, overhang);
    setExtensionOverhang(overhang);
    setMeasurementExtensionOverhangStore(overhang);
    refreshAllMeasurements(); 
  };

//   const handleCircleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//   const size = parseFloat(e.target.value);
//   setCircleSizeState(size);
//   refreshAllMeasurements();
// };

  const handleLabelBgColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setLabelBgColorState(color);
    updateMeasurementLabelSettings(activeMeasurement.id, { labelBackgroundColor: color });
    setMeasurementLabelBgColor(color);
    updateVisualColors(activeMeasurement.id);
    refreshAllMeasurements(); 
  };

  const handleLabelBgOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const opacity = parseFloat(e.target.value);
  setLabelBgOpacityState(opacity);
  updateMeasurementLabelSettings(activeMeasurement.id, { labelBackgroundOpacity: opacity });
  setMeasurementLabelBgOpacity(opacity);
  updateVisualColors(activeMeasurement.id);
  refreshAllMeasurements();
};

  const handleLabelTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setLabelTextColorState(color);
    updateMeasurementLabelSettings(activeMeasurement.id, { labelTextColor: color });
     setMeasurementLabelTextColor(color);
    updateVisualColors(activeMeasurement.id);
    refreshAllMeasurements(); 
  };

  const handleLabelFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseFloat(e.target.value);
    setLabelFontSizeState(size);
    updateMeasurementLabelSettings(activeMeasurement.id, { labelFontSize: size });
    setMeasurementLabelFontSize(size);
    refreshAllMeasurements(); 
  };

  // const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const offset = parseFloat(e.target.value);
  //   setDimensionOffsetState(offset);
  //   setActiveMeasurementOffset(offset);
  //   refreshAllMeasurements(); 
  // };

  const handleDefaultOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const offset = parseFloat(e.target.value);
    setDefaultOffsetState(offset);
    setDefaultDimensionOffset(offset);
  };


    const handleCircleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCircleColorState(color);
    updateMeasurementCircleSettings(activeMeasurement.id, { circleColor: color });
    setMeasurementCircleColor(color);
    updateVisualColors(activeMeasurement.id);
    refreshAllMeasurements();
  };

  const handleCircleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseFloat(e.target.value);
    setCircleSizeState(size);
    updateMeasurementCircleSettings(activeMeasurement.id, { circleSize: size });
    setMeasurementCircleSize(size);
    updateMeasurementCircleGeometry(activeMeasurement.id);
    refreshAllMeasurements();
  };

  const handleShowCirclesToggle = () => {
    const newShow = !showCircles;
    setShowCirclesState(newShow);
    updateMeasurementCircleSettings(activeMeasurement.id, { showCircles: newShow });
    // setMeasurementShowCircles(newShow);
    updateMeasurementCircleVisibility(activeMeasurement.id);
    refreshAllMeasurements();
  };

 const handleDeleteClick = () => {
  if (!activeMeasurement) return;
  deleteMeasurementById(activeMeasurement.id);
  onClose();
};


const handleToggleAllCircles = () => {
  const newShow = !showCircles;
  setShowCirclesState(newShow);
  
  // Update the global default in store
  setMeasurementShowCircles(newShow); // ✅ Now this line uses the hook
  
  // Get all measurements from measurementManager instead of store
  
  const allMeasurements = getAllMeasurements();
  
  // Update ALL measurements at once
  allMeasurements.forEach((measurement: any) => {
    updateMeasurementCircleSettings(measurement.id, { showCircles: newShow });
    updateMeasurementCircleVisibility(measurement.id);
  });
  
  refreshAllMeasurements();
};



  return (
    <div className="measurement-settings-panel">
      <div className="measurement-settings-header" style={{display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8', justifyContent:'space-between'}}>
          <span style={{ fontWeight: 'bold'}}>Measurement Settings</span>
        <button onClick={handleDeleteClick}
        style={{
          padding: '2px 6px',
          fontSize: 10,
          borderRadius:3,
          border: 'node',
          backgroundColor: '#d32f2f',
          color: 'white',
          cursor: 'pointer'
        }}
        > Del</button>
        </div>
        
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="measurement-settings-content">
        {/* DIMENSION LINE */}
        <div className="setting-section">
          <h4>Dimension Line</h4>
          <div className="setting-group">
            <label>Color</label>
            <input
              type="color"
              value={dimensionLineColor}
              onChange={handleDimensionColorChange}
            />
          </div>
        </div>

        <div className="section-divider" />

        {/* EXTENSION LINES */}
        <div className="setting-section">
          <h4>Extension Lines</h4>
          <div className="setting-group">
            <label>Color</label>
            <input
              type="color"
              value={extensionLineColor}
              onChange={handleExtensionColorChange}
            />
          </div>
          <div className="setting-group">
            <label>Overhang</label>
            <input
              type="range"
              value={extensionOverhangValue}
              onChange={handleExtensionOverhangChange}
              step="0.05"
              min="0"
              max="2"
            />
            <span className="range-value">{extensionOverhangValue.toFixed(2)}</span>
          </div>
        </div>

        <div className="section-divider" />

        {/* ARROWS */}
        <div className="setting-section">
          <h4>Arrows</h4>
          <div className='setting-group'>
            <label>Color</label>
            <input
            type="color"
            value={arrowColor}
            onChange={handleArrowColorChange}
            />
          </div>
          <div className="setting-group">
            <label>Size</label>
            <input
              type="range"
              value={arrowSizeValue}
              onChange={handleArrowSizeChange}
              step="0.01"
              min="0.05"
              max="1"
            />
            <span className="range-value">{arrowSizeValue.toFixed(2)}</span>
          </div>
        </div>

        <div className="section-divider" />

<div className="setting-section">
  <h4>Point Circles</h4>
  
  {/* Global Toggle for ALL measurements */}
  <div className="setting-group">
    <label>Show All Circles</label>
    <button
      onClick={handleToggleAllCircles}
      style={{
        padding: '6px 16px',
        borderRadius: '4px',
        border: '1px solid #666',
        background: showCircles ? '#4a9eff' : '#2a2a2a',
        color: 'white',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 'bold',
        width: '100%'
      }}
    >
      {showCircles ? 'Hide All Circles' : 'Show All Circles'}
    </button>
  </div>

  <div className="section-divider" style={{ margin: '8px 0' }} />

  {/* Individual measurement settings */}
  <div className="setting-group">
    <label>This Measurement</label>
    <button
      onClick={handleShowCirclesToggle}
      style={{
        padding: '4px 12px',
        borderRadius: '4px',
        border: '1px solid #666',
        background: showCircles ? '#4a9eff' : '#2a2a2a',
        color: 'white',
        cursor: 'pointer',
        fontSize: '12px'
      }}
    >
      {showCircles ? 'ON' : 'OFF'}
    </button>
  </div>
  
  {showCircles && (
    <>
      <div className="setting-group">
        <label>Color</label>
        <input
          type="color"
          value={circleColor}
          onChange={handleCircleColorChange}
        />
      </div>
      <div className="setting-group">
        <label>Size</label>
        <input
          type="range"
          value={circleSize}
          onChange={handleCircleSizeChange}
          step="0.01"
          min="0.05"
          max="0.2"
        />
        <span className="range-value">{circleSize.toFixed(2)}</span>
      </div>
    </>
  )}
</div>


        <div className="section-divider" />

        {/* LABEL */}
        <div className="setting-section">
          <h4>Label</h4>
          <div className="setting-group">
            <label>Background</label>
            <input
              type="color"
              value={labelBgColor}
              onChange={handleLabelBgColorChange}
            />
          </div>

            <div className="setting-group">
    <label>Background Opacity</label>
    <input
      type="range"
      value={labelBgOpacity}
      onChange={handleLabelBgOpacityChange}
      step="0.05"
      min="0"
      max="1"
    />
    <span className="range-value">{(labelBgOpacity * 100).toFixed(0)}%</span>
  </div>


          <div className="setting-group">
            <label>Text Color</label>
            <input
              type="color"
              value={labelTextColor}
              onChange={handleLabelTextColorChange}
            />
          </div>
          <div className="setting-group">
            <label>Font Size</label>
            <input
              type="range"
              value={labelFontSize}
              onChange={handleLabelFontSizeChange}
              step="1"
              min="8"
              max="24"
            />
            <span className="range-value">{labelFontSize}</span>
          </div>
          <div className="setting-group">
            <label>Default Offset</label>
            <input
              type="number"
              value={defaultOffset}
              onChange={handleDefaultOffsetChange}
              step="0.1"
              min="0"
              max="5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementSettings;
