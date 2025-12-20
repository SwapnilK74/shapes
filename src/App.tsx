// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { canvas, renderer, setRendererSize } from './core/renderer';
import { camera, updateCamera } from './core/camera';
import { scene } from './core/scene';
import { createControls } from './core/controls';
import { attachDrawingEvents } from './drawing/drawingPlane';
import { setShapeTool, setSnapEnabled } from './drawing/drawingState';
import type { ShapeTool } from './drawing/drawingState';
import { getSelectedObject, setSelectedColor } from './drawing/selection';
import { setSelectedOutlineColor } from './drawing/outlineSelection';
import { initializeDimensionRenderer, updateAllDimensionLabels } from './drawing/dimensions/dimensionRenderer';
// import { setUnitSystem, clearAllDimensions } from './drawing/dimensions/dimensionManager';
// import type { UnitSystem } from './drawing/dimensions/dimensionManager';
import { setDimensionsEnabled } from './drawing/dimensions/dimensionUpdater';
import { getShapeWidthOffset, getShapeHeightOffset } from './drawing/dimensions/dimensionOffset';
import { startMeasureMode, exitMeasureMode, setSnapToPoints, setSnapToEdges, setAllowFreeMeasurement } from './drawing/measurements/measureTool';
import { initializeMeasurementRenderer, updateAllMeasurementLabels,toggleAllMeasurementsVisibility  } from './drawing/measurements/measurementRenderer';
import { deleteMeasurementById, deselectMeasurement } from './drawing/measurements/measurementInteraction';
import MeasurementSettings from './components/MeasurementSettings';
import { useStore } from './store';
import * as THREE from 'three';
import { deleteSelectedShape } from './drawing/deleteShape';
import { setAlignmentEnabled,  } from './drawing/dragSelection';


import './index.css';
import './drawing/dimensions/dimensionStyles.css';

function UnitSystemToggle() {
  const unitSystem = useStore((state) => state.unitSystem);
  const setUnitSystemStore = useStore((state) => state.setUnitSystem);

  const handleToggle = () => {
    const newUnit = unitSystem === 'metric' ? 'imperial' : 'metric';
    setUnitSystemStore(newUnit);
  }

  return (
    <div style={{ padding: '8px' }}>
      <label>Units: </label>
      <button
        onClick={handleToggle}
        className='tool-button'
        style={{
          padding: '4px 12px',
          borderRadius: '4px',
          background: unitSystem === 'metric' ? '#4a9eff' : '#ff8844',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        {unitSystem === 'metric' ? 'Meters (m)' : 'Feet/Inches (ft)'}
      </button>
    </div>
  );
}


// Helper function to check if object is a line
function isLineObject(obj: THREE.Object3D): obj is THREE.Line {
  return obj instanceof THREE.Line && obj.userData.geometryType === 'line';
}

const App: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  
  // Get default colors from store
  const defaultFillColor = useStore((state) => state.defaultFillColor);
  const setDefaultFillColor = useStore((state) => state.setDefaultFillColor);
  const defaultOutlineColor = useStore((state) => state.defaultOutlineColor);
  const setDefaultOutlineColor = useStore((state) => state.setDefaultOutlineColor);
  const activeMeasurementId = useStore((state) => state.activeMeasurementId);

  const [activeTool, setActiveTool] = useState<ShapeTool>('select');
  // const [currentUnit, setCurrentUnit] = useState<UnitSystem>('metric');
  const [showDimensions, ] = useState(false);
  const [, setSelectedWidthOffset] = useState<number>(0.5);
  const [, setSelectedHeightOffset] = useState<number>(0.5);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [measureModeActive, setMeasureModeActive] = useState(false);
const [measurementsVisible, setMeasurementsVisible] = useState(true);
const [alignmentEnabledState, setAlignmentEnabledState] = useState<boolean>(true);


  // Snap mode states
  const [snapPointsEnabled, setSnapPointsEnabled] = useState(true);
  const [snapEdgesEnabled, setSnapEdgesEnabled] = useState(false);
  const [freeMeasurementEnabled, setFreeMeasurementEnabled] = useState(true);

  // Selected shape's actual colors
  const [selectedShapeFillColor, setSelectedShapeFillColor] = useState<string>('#00ff88');
  const [selectedShapeOutlineColor, setSelectedShapeOutlineColor] = useState<string>('#ffffff');


  
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    wrapper.appendChild(canvas);

    const rect = wrapper.getBoundingClientRect();
    setRendererSize(rect.width, rect.height);
    updateCamera(rect.width, rect.height);

    initializeDimensionRenderer(wrapper);
    initializeMeasurementRenderer(wrapper);

    setDimensionsEnabled(false);

    const controls = createControls(camera, renderer.domElement);
    attachDrawingEvents(renderer.domElement);

  //     const handleLabelDblClick = (e: MouseEvent) => {
  //   // delegate to measurementInteraction helper
  //   import('./drawing/measurements/measurementInteraction').then(
  //     ({ handleLabelDoubleClick }) => {
  //       handleLabelDoubleClick(e, wrapper);
  //     }
  //   );
  // };
  // wrapper.addEventListener('dblclick', handleLabelDblClick);

    const onResize = () => {
      const r = wrapper.getBoundingClientRect();
      setRendererSize(r.width, r.height);
      updateCamera(r.width, r.height);
    };
    window.addEventListener('resize', onResize);

    let running = true;
    const loop = () => {
      if (!running) return;
      requestAnimationFrame(loop);
      controls.update();
      
      updateAllDimensionLabels(canvas);
      updateAllMeasurementLabels(canvas);
      
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      running = false;
      window.removeEventListener('resize', onResize);
      // wrapper.removeEventListener('dblclick', handleLabelDblClick);
      if (wrapper.contains(canvas)) wrapper.removeChild(canvas);
    };
  }, []);

  useEffect(() => {
    const checkSelection = () => {
      const selectedObject = getSelectedObject();
      const newId = selectedObject?.uuid || null;
      
      if (newId !== selectedObjectId) {
        setSelectedObjectId(newId);
      }
    };

    const interval = setInterval(checkSelection, 100);
    return () => clearInterval(interval);
  }, [selectedObjectId]);

  useEffect(() => {
    const selectedObject = getSelectedObject();
    if (selectedObject && showDimensions) {
      const shapeWidthOffset = getShapeWidthOffset(selectedObject);
      const shapeHeightOffset = getShapeHeightOffset(selectedObject);
      
      
      setSelectedWidthOffset(shapeWidthOffset);
      setSelectedHeightOffset(shapeHeightOffset);
    }
  }, [selectedObjectId, showDimensions]);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selectedShape = getSelectedObject();
      if (selectedShape) {
        deleteSelectedShape();
      } else if (activeMeasurementId) {          
        deleteMeasurementById(activeMeasurementId);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [activeMeasurementId]);

  // Update selected shape colors when selection changes
  useEffect(() => {
    const selectedObject = getSelectedObject();
    
    if (selectedObject && selectedObject instanceof THREE.Mesh) {
      // Get fill color from mesh material
      const material = selectedObject.material as THREE.MeshBasicMaterial;
      if (material && material.color) {
        const fillHex = '#' + material.color.getHexString();
        setSelectedShapeFillColor(fillHex);
      }

      // Get outline color from the child LineLoop
      const outline = selectedObject.children.find(
        (child) => child instanceof THREE.LineLoop
      ) as THREE.LineLoop | undefined;

      if (outline) {
        const outlineMaterial = outline.material as THREE.LineBasicMaterial;
        if (outlineMaterial && outlineMaterial.color) {
          const outlineHex = '#' + outlineMaterial.color.getHexString();
          setSelectedShapeOutlineColor(outlineHex);
        }
      }
    } else if (selectedObject && isLineObject(selectedObject)) {
      // For lines, only get the fill color (line color)
      const material = selectedObject.material as THREE.LineBasicMaterial;
      if (material && material.color) {
        const fillHex = '#' + material.color.getHexString();
        setSelectedShapeFillColor(fillHex);
      }
    }
  }, [selectedObjectId]);

  const handleToolClick = (tool: ShapeTool) => {
    if (measureModeActive) {
      exitMeasureMode();
      setMeasureModeActive(false);
    }
    
    setActiveTool(tool);
    setShapeTool(tool);
  };

  const handleMeasurementsVisibilityToggle = () => {
  const newState = !measurementsVisible;
  setMeasurementsVisible(newState);
  toggleAllMeasurementsVisibility(newState);
};


  const handleMeasureToggle = () => {
    if (measureModeActive) {
      exitMeasureMode();
      setMeasureModeActive(false);
      setActiveTool('select');
      setShapeTool('select');
    } else {
      startMeasureMode();
      setMeasureModeActive(true);
      setActiveTool('select');
      setShapeTool('select');
    }
  };

  const handleCloseMeasurementSettings = () => {
    deselectMeasurement();
  };

  const handleDefaultFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setDefaultFillColor(hex);
  };

  const handleDefaultOutlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setDefaultOutlineColor(hex);
  };

  const handleSelectedFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setSelectedShapeFillColor(hex);
    setSelectedColor(hex);
  };

  const handleSelectedOutlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setSelectedShapeOutlineColor(hex);
    setSelectedOutlineColor(hex);
  };

  // const handleUnitToggle = () => {
  //   const newUnit: UnitSystem = currentUnit === 'metric' ? 'imperial' : 'metric';
  //   setCurrentUnit(newUnit);
  //   setUnitSystem(newUnit);
    
  //   if (showDimensions) {
  //     const selectedObject = getSelectedObject();
  //     refreshDimensionsForObject(selectedObject);
  //   }
  // };

  // const handleDimensionToggle = () => {
  //   const newShowState = !showDimensions;
  //   setShowDimensions(newShowState);
  //   setDimensionsEnabled(newShowState);

  //   if (newShowState) {
  //     const selectedObject = getSelectedObject();
  //     refreshDimensionsForObject(selectedObject);
  //   } else {
  //     clearAllDimensions();
  //   }
  // };

  // const handleWidthOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = parseFloat(e.target.value) || 0;
  //   setSelectedWidthOffset(value);
    
  //   const selectedObject = getSelectedObject();
  //   if (selectedObject && showDimensions) {
  //     setShapeWidthOffset(selectedObject, value);
  //     refreshDimensionsForObject(selectedObject);
  //   }
  // };

  // const handleHeightOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = parseFloat(e.target.value) || 0;
  //   setSelectedHeightOffset(value);
    
  //   const selectedObject = getSelectedObject();
  //   if (selectedObject && showDimensions) {
  //     setShapeHeightOffset(selectedObject, value);
  //     refreshDimensionsForObject(selectedObject);
  //   }
  // };

  const handleSnapPointsToggle = () => {
    const newState = !snapPointsEnabled;
    setSnapPointsEnabled(newState);
    setSnapToPoints(newState);
  };

  const handleSnapEdgesToggle = () => {
    const newState = !snapEdgesEnabled;
    setSnapEdgesEnabled(newState);
    setSnapToEdges(newState);
  };

  const handleFreeMeasurementToggle = () => {
    const newState = !freeMeasurementEnabled;
    setFreeMeasurementEnabled(newState);
    setAllowFreeMeasurement(newState);
  };

  const handleAlignmentToggle = () => {
  const newState = !alignmentEnabledState;
  setAlignmentEnabledState(newState);
  setAlignmentEnabled(newState);
};

  const hasSelectedObject = selectedObjectId !== null;
  const selectedObject = getSelectedObject();
  const isSelectedLine = selectedObject ? isLineObject(selectedObject) : false;

  return (
    <div className="app-root">
      <div className="canvas-wrapper" ref={wrapperRef} />

      <MeasurementSettings
        isVisible={activeMeasurementId !== null}
        onClose={handleCloseMeasurementSettings}
      />

      <div className="right-panel">
        <h3>Tools</h3>
        <button
          className={'tool-button' + (activeTool === 'select' && !measureModeActive ? ' tool-button--active' : '')}
          onClick={() => handleToolClick('select')}
        >
          Select
        </button>
        <button
          className={'tool-button' + (activeTool === 'plane' ? ' tool-button--active' : '')}
          onClick={() => handleToolClick('plane')}
        >
          Plane
        </button>
        <button
          className={'tool-button' + (activeTool === 'circle' ? ' tool-button--active' : '')}
          onClick={() => handleToolClick('circle')}
        >
          Circle
        </button>
        <button
          className={'tool-button' + (activeTool === 'triangle' ? ' tool-button--active' : '')}
          onClick={() => handleToolClick('triangle')}
        >
          Triangle
        </button>
        <button
          className={'tool-button' + (activeTool === 'line' ? ' tool-button--active' : '')}
          onClick={() => handleToolClick('line')}
        >
          Line
        </button>

        {hasSelectedObject && (
          <button
            className="tool-button"
            onClick={() => deleteSelectedShape()}
            style={{ 
              marginTop: 12, 
              width: '100%',
              backgroundColor: '#d32f2f'
            }}
          >
            Delete Shape
          </button>
        )}

        <h3 style={{ marginTop: 16, marginBottom: 4 }}>Magic Alignment</h3>
<button
  className={'tool-button' + (alignmentEnabledState ? ' tool-button--active' : '')}
  onClick={handleAlignmentToggle}
  style={{ width: '100%', marginTop: 4 }}
>
  {alignmentEnabledState ? 'Alignment: On' : 'Alignment: Off'}
</button>


<h3 style={{ marginTop: 16, marginBottom: 4 }}>Measure Tool</h3>
        <button
          className={'tool-button' + (measureModeActive ? ' tool-button--active' : '')}
          onClick={handleMeasureToggle}
          style={{ marginTop: 12 }}
        >
          {measureModeActive ? 'Exit Measure' : 'Measure'}
        </button>

        <button
  className={'tool-button' + (measurementsVisible ? ' tool-button--active' : '')}
  onClick={handleMeasurementsVisibilityToggle}
  style={{ width: '100%', marginTop: 4 }}
>
  {measurementsVisible ? 'Hide Measurements' : 'Show Measurements'}
</button>



        {measureModeActive && (
          <div style={{ marginTop: 8 }}>
            <h4 style={{ margin: '8px 0 4px 0', fontSize: '14px' }}>Snap</h4>
            
            <button
              className={'tool-button' + (snapPointsEnabled ? ' tool-button--active' : '')}
              onClick={handleSnapPointsToggle}
              style={{ width: '100%', marginBottom: 4 }}
            >
              Points (verts + mids)
            </button>

            <button
              className={'tool-button' + (snapEdgesEnabled ? ' tool-button--active' : '')}
              onClick={handleSnapEdgesToggle}
              style={{ width: '100%', marginBottom: 4 }}
            >
              Edges
            </button>

            <button
              className={'tool-button' + (freeMeasurementEnabled ? ' tool-button--active' : '')}
              onClick={handleFreeMeasurementToggle}
              style={{ width: '100%' }}
            >
              Free Measurement
            </button>
          </div>
        )}
{/* 
        <h3 style={{ marginTop: 16, marginBottom: 4 }}>Dimensions</h3>
        <button
          className={'tool-button' + (showDimensions ? ' tool-button--active' : '')}
          onClick={handleDimensionToggle}
          style={{ width: '100%' }}
        >
          {showDimensions ? 'Hide Dimensions' : 'Show Dimensions'}
        </button>

        {showDimensions && (
          <>
            <h3 style={{ marginTop: 16, marginBottom: 4 }}>Width Offset</h3>
            <input
              type="number"
              value={selectedWidthOffset}
              onChange={handleWidthOffsetChange}
              step="0.1"
              min="0"
              max="5"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '14px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#222',
                color: 'white'
              }}
            />

            <h3 style={{ marginTop: 16, marginBottom: 4 }}>Height Offset</h3>
            <input
              type="number"
              value={selectedHeightOffset}
              onChange={handleHeightOffsetChange}
              step="0.1"
              min="0"
              max="5"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '14px',
                border: '1px solid #444',
                borderRadius: '4px',
                background: '#222',
                color: 'white'
              }}
            />

            <h3 style={{ marginTop: 16, marginBottom: 4 }}>Units</h3>
            <button
              className="tool-button"
              onClick={handleUnitToggle}
              style={{ width: '100%' }}
            >
              {currentUnit === 'metric' ? 'Metric (m)' : 'Imperial (ft/in)'}
            </button>
          </>
        )}
         */}

        {/* Show DEFAULT colors when NO shape is selected */}
        {!hasSelectedObject && (
          <>
            <h3 style={{ marginTop: 16, marginBottom: 4 }}>Default Fill Color</h3>
            <input
              type="color"
              value={defaultFillColor}
              onChange={handleDefaultFillChange}
              style={{ width: '100%', height: 32, padding: 0, border: 'none' }}
            />
            <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              New shapes will use this color
            </p>

            <h3 style={{ marginTop: 12, marginBottom: 4 }}>Default Outline Color</h3>
            <input
              type="color"
              value={defaultOutlineColor}
              onChange={handleDefaultOutlineChange}
              style={{ width: '100%', height: 32, padding: 0, border: 'none' }}
            />
            <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              New shape outlines will use this color
            </p>
          </>
        )}

        {/* Show SELECTED SHAPE colors when shape IS selected */}
        {hasSelectedObject && (
          <>
            <h3 style={{ marginTop: 16, marginBottom: 4 }}>Fill Color</h3>
            <input
              type="color"
              value={selectedShapeFillColor}
              onChange={handleSelectedFillChange}
              style={{ width: '100%', height: 32, padding: 0, border: 'none' }}
            />
            <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              {isSelectedLine ? 'Change line color' : 'Change selected shape fill'}
            </p>

            {/* Only show outline color picker if NOT a line */}
            {!isSelectedLine && (
              <>
                <h3 style={{ marginTop: 12, marginBottom: 4 }}>Outline Color</h3>
                <input
                  type="color"
                  value={selectedShapeOutlineColor}
                  onChange={handleSelectedOutlineChange}
                  style={{ width: '100%', height: 32, padding: 0, border: 'none' }}
                />
                <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  Change selected shape outline
                </p>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 12, display: 'flex' }}>
          <input
            id="snap-toggle"
            type="checkbox"
            onChange={(e) => setSnapEnabled(e.target.checked)}
          />
          <label htmlFor="snap-toggle" style={{ fontSize: 12 }}>
            Snap to grid
          </label>
        </div>

 <UnitSystemToggle />

      </div>
    </div>
  );
};

export default App;
