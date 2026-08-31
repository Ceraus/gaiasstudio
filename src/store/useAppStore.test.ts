import { beforeEach, describe, expect, it } from 'vitest';
import type { AveryTemplate } from '@/types';
import { useAppStore } from './useAppStore';

const circle: AveryTemplate = {
  id: 'round-2',
  name: '2" Circle',
  brand: 'Avery',
  averyCode: '22807',
  shape: 'circle',
  labelWidthIn: 2,
  labelHeightIn: 2,
  pageWidthIn: 8.5,
  pageHeightIn: 11,
  columns: 3,
  rows: 3,
  marginTopIn: 0.5,
  marginLeftIn: 0.5,
  gutterXIn: 0.2,
  gutterYIn: 0.2,
  cornerRadiusIn: 0,
  perSheet: 9,
  rotateForPrint: false,
  contexts: ['front', 'back', 'side'],
};

describe('label face tag', () => {
  beforeEach(() => {
    useAppStore.setState({
      template: circle,
      context: 'front',
    });
  });

  it('defaults to front and setContext does not swap the Avery SKU', () => {
    expect(useAppStore.getState().context).toBe('front');
    useAppStore.getState().setContext('side');
    const next = useAppStore.getState();
    expect(next.context).toBe('side');
    expect(next.template?.id).toBe('round-2');
  });

});
