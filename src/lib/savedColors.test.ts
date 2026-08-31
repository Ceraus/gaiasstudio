import { afterEach, describe, expect, it } from 'vitest';
import {
  SAVED_COLORS_KEY,
  addSavedColor,
  isSavedColor,
  loadSavedColors,
  removeSavedColor,
  resetSavedColors,
  seedSavedColors,
} from './savedColors';

const memory = new Map<string, string>();

const fakeStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};

Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true });

afterEach(() => {
  memory.clear();
  resetSavedColors();
});

describe('savedColors', () => {
  it('saves unique hex colours and persists them', () => {
    addSavedColor('#a1b2c3');
    addSavedColor('ff8800');
    expect(loadSavedColors()).toEqual(['#FF8800', '#A1B2C3']);
    expect(isSavedColor('#ff8800')).toBe(true);
    expect(JSON.parse(memory.get(SAVED_COLORS_KEY) ?? '[]')).toEqual(['#FF8800', '#A1B2C3']);
  });

  it('removes a colour and ignores junk on read', () => {
    addSavedColor('#111111');
    addSavedColor('#222222');
    expect(removeSavedColor('#111111')).toEqual(['#222222']);

    resetSavedColors();
    memory.set(SAVED_COLORS_KEY, JSON.stringify(['nope', '#ABCDEF', 12, '#abcdef']));
    expect(loadSavedColors()).toEqual(['#ABCDEF']);
  });

  it('seeds from brand colours only when nothing is saved yet', () => {
    expect(seedSavedColors(['#123456', 'bad'])).toEqual(['#123456']);
    expect(seedSavedColors(['#FFFFFF'])).toEqual(['#123456']);
  });
});
