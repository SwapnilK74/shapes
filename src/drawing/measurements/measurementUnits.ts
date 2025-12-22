// src/drawing/measurements/measurementUnits.ts
import { useStore } from '../../store';

/**
 * Convert a user-entered length (string) in the current display units
 * to meters (scene units).
 *
 * Examples:
 *  unitSystem = 'metric',  input "2.5"   -> 2.5 meters
 *  unitSystem = 'imperial', input "4.92" -> 1.50 meters (ft -> m)
 */
export function convertDisplayToMeters(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return 0;

  const unitSystem = useStore.getState().unitSystem;

  if (unitSystem === 'metric') {
    // User typed meters (matches formatMeasurementDistance Option 3)
    return n;
  } else {
    // User typed feet (since you display distances as decimal feet)
    const meters = n / 3.28084;
    return meters;
  }
}
