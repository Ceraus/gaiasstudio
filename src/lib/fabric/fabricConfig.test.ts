import { describe, expect, it } from 'vitest';
import { InteractiveFabricObject, Textbox } from 'fabric';
import { ROTATE_CURSOR, configureFabricOnce } from './fabricConfig';

describe('Avery rotate handle', () => {
  it('replaces Fabric’s default mtr circle on objects and textboxes', () => {
    configureFabricOnce();

    const objectMtr = InteractiveFabricObject.createControls().controls.mtr;
    // Fabric's default connector runs into the icon center; we draw a clipped stem.
    expect(objectMtr.withConnection).toBe(false);
    expect(objectMtr.actionName).toBe('rotate');
    expect(objectMtr.sizeX).toBe(18);
    expect(objectMtr.sizeY).toBe(18);
    expect(objectMtr.offsetY).toBe(-26);
    expect(objectMtr.render.name).toBe('renderAveryRotateControl');
    expect(objectMtr.cursorStyle).toBe(ROTATE_CURSOR);
    expect(objectMtr.cursorStyle).toMatch(/url\("data:image\/svg\+xml/);
    expect(objectMtr.cursorStyle).toMatch(/16 16, alias$/);

    const textMtr = Textbox.createControls().controls.mtr;
    expect(textMtr.render.name).toBe('renderAveryRotateControl');
    expect(textMtr.sizeX).toBe(18);
    expect(textMtr.withConnection).toBe(false);
    expect(textMtr.cursorStyle).toBe(ROTATE_CURSOR);
  });

  it('does not change scale or mid-side control cursors', () => {
    configureFabricOnce();
    const { controls } = InteractiveFabricObject.createControls();
    for (const key of ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'] as const) {
      expect(controls[key].cursorStyle).not.toBe(ROTATE_CURSOR);
    }
  });
});
