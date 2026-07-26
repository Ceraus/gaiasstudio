import { FabricObject, InteractiveFabricObject } from 'fabric';

// Custom properties that must survive canvas serialization (save/restore/history).
export const CUSTOM_PROPS = [
  'id',
  'name',
  'gaiaKind',
  'locked',
  // Curved-text amount (-100…100). The Fabric `path` itself is rebuilt from this
  // on load so serialized JSON stays portable (see editorController.load).
  'gaiaCurve',
  // Whether numeric width/height edits keep the original proportions.
  'gaiaLockAspect',
  // Text-case transform ('uppercase'|'lowercase'|'capitalize'|'none').
  // We store the pre-transform text so the user can revert to 'none'.
  'gaiaTextCase',
  'gaiaOriginalText',
  'selectable',
  'evented',
  'editable',
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY',
  'hasControls',
  // Marks the auto-generated legibility overlay rect so it can be found/toggled.
  'isLegibilityOverlay',
  // Marks the single replaceable background slot in the strict layer stack.
  'isBackgroundLayer',
  // Keeps the locked white base when context auto-layout replaces foregrounds.
  'isBaseLayer',
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
