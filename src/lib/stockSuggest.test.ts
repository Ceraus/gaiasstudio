import { describe, expect, it } from 'vitest';
import { mergeStockSuggestions, parseSuggestPayload, splitSuggestHighlight } from './stockSuggest';

describe('stockSuggest', () => {
  it('parses Google, DuckDuckGo, and Datamuse payloads', () => {
    expect(parseSuggestPayload('["linen",["linen texture","linen fabric"]]')).toEqual([
      'linen texture',
      'linen fabric',
    ]);
    expect(parseSuggestPayload(['lino', ['lino tela', 'linóleo']])).toEqual(['lino tela', 'linóleo']);
    expect(parseSuggestPayload([{ word: 'marble' }, { word: 'marbled' }])).toEqual(['marble', 'marbled']);
    expect(parseSuggestPayload('<?php echo 1;')).toEqual([]);
  });

  it('merges a few local matches ahead of live web completions', () => {
    const merged = mergeStockSuggestions(
      'lin',
      [{ query: 'linen texture', label: 'Linen', kind: 'look' }],
      ['linen pants', 'linen texture', 'linen fabric background'],
    );
    expect(merged.map((item) => item.query)).toEqual([
      'linen texture',
      'linen pants',
      'linen fabric background',
    ]);
    expect(merged[1]?.kind).toBe('web');
  });

  it('highlights the typed prefix the way a search box does', () => {
    expect(splitSuggestHighlight('linen texture', 'lin')).toEqual({
      head: 'lin',
      tail: 'en texture',
    });
    expect(splitSuggestHighlight('Mármol', 'marmol')).toEqual({
      head: 'Mármol',
      tail: '',
    });
  });
});
