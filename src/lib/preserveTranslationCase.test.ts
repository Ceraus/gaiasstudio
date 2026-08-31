import { describe, expect, it } from 'vitest';
import { detectTranslationCase, preserveTranslationCase } from './preserveTranslationCase';

describe('detectTranslationCase', () => {
  it('classifies ALL CAPS, Title Case, sentence case, and lowercase', () => {
    expect(detectTranslationCase('WELCOME TO MIAMI')).toBe('upper');
    expect(detectTranslationCase('Welcome To Miami')).toBe('title');
    expect(detectTranslationCase('Welcome')).toBe('sentence');
    expect(detectTranslationCase('Welcome to Miami')).toBe('sentence');
    expect(detectTranslationCase('welcome to miami')).toBe('lower');
  });
});

describe('preserveTranslationCase', () => {
  it('uppercases the translation when the source is ALL CAPS', () => {
    expect(preserveTranslationCase('bienvenido a miami', 'WELCOME TO MIAMI', 'es'))
      .toBe('BIENVENIDO A MIAMI');
    expect(preserveTranslationCase('peso neto', 'NET WT', 'es')).toBe('PESO NETO');
  });

  it('title-cases the translation when the source is Title Case', () => {
    expect(preserveTranslationCase('bienvenido a miami', 'Welcome To Miami', 'es'))
      .toBe('Bienvenido A Miami');
    expect(preserveTranslationCase('limpieza profunda', 'Deep Cleansing', 'es'))
      .toBe('Limpieza Profunda');
  });

  it('keeps sentence / proper-noun style and does not flatten to lowercase', () => {
    expect(preserveTranslationCase('bienvenido a miami', 'Welcome to Miami', 'es'))
      .toBe('Bienvenido a Miami');
    expect(preserveTranslationCase('deja la piel con un tacto cremoso.', 'Leaves skin feeling creamy.', 'es'))
      .toBe('Deja la piel con un tacto cremoso.');
    expect(preserveTranslationCase('hecho a mano', 'Handmade', 'es')).toBe('Hecho a mano');
  });

  it('leaves already-lowercase sources lowercase', () => {
    expect(preserveTranslationCase('Bienvenido a Miami', 'welcome to miami', 'es'))
      .toBe('bienvenido a miami');
    expect(preserveTranslationCase('JABÓN ARTESANAL', 'handmade soap', 'es'))
      .toBe('jabón artesanal');
  });

  it('maps mixed per-word caps when word counts match', () => {
    expect(preserveTranslationCase('bienvenido a miami', 'WELCOME to Miami', 'es'))
      .toBe('BIENVENIDO a Miami');
  });

  it('falls back to the dominant pattern when word counts differ', () => {
    expect(preserveTranslationCase('bienvenidos a la ciudad de miami', 'Welcome To Miami', 'es'))
      .toBe('Bienvenidos A La Ciudad De Miami');
    expect(preserveTranslationCase('solo para uso externo', 'For external use only. Avoid eyes.', 'es'))
      .toBe('Solo para uso externo');
  });
});
