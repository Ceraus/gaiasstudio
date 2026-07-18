import { FabricObject, InteractiveFabricObject } from 'fabric';

// Custom properties that must survive canvas serialization (save/restore/history).
export const CUSTOM_PROPS = [
  'id',
  'name',
  'gaiaKind',
  'locked',
  'selectable',
  'evented',
  'editable',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'hasControls',
];

let configured = false;

/** Applies global Fabric defaults once (control styling + serialization props). */
export function configureFabricOnce() {
  if (configured) return;
  configured = true;

  FabricObject.customProperties = CUSTOM_PROPS;

  // A clean, Canva-like selection style.
  InteractiveFabricObject.ownDefaults = {
    ...InteractiveFabricObject.ownDefaults,
    cornerColor: '#ffffff',
    cornerStrokeColor: '#7c3aed',
    cornerStyle: 'circle',
    cornerSize: 11,
    transparentCorners: false,
    borderColor: '#7c3aed',
    borderScaleFactor: 1.5,
    padding: 1,
  };
}
