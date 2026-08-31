/** Word tokens: letters plus hyphen / apostrophe so "Anti-Aging" and "Gaia's" stay one unit. */
const WORD_RE = /\p{L}[\p{L}\p{M}'’.-]*/gu;

export type TranslationCasePattern = 'upper' | 'lower' | 'title' | 'sentence' | 'mixed';

function isUpperChar(ch: string, locale?: string): boolean {
  return ch !== ch.toLocaleLowerCase(locale);
}

function isLowerChar(ch: string, locale?: string): boolean {
  return ch !== ch.toLocaleUpperCase(locale);
}

function lettersOf(text: string): string[] {
  return text.match(/\p{L}/gu) ?? [];
}

type WordPattern = 'upper' | 'lower' | 'title' | 'mixed' | 'none';

function wordPattern(word: string, locale?: string): WordPattern {
  const letters = lettersOf(word);
  if (!letters.length) return 'none';
  const hasUpper = letters.some((ch) => isUpperChar(ch, locale));
  const hasLower = letters.some((ch) => isLowerChar(ch, locale));
  if (hasUpper && !hasLower) return 'upper';
  if (hasLower && !hasUpper) return 'lower';
  const rest = letters.slice(1);
  if (isUpperChar(letters[0], locale) && rest.every((ch) => !isUpperChar(ch, locale))) return 'title';
  return 'mixed';
}

function titleCaseWord(word: string, locale?: string): string {
  let seenLetter = false;
  return [...word]
    .map((ch) => {
      if (!/\p{L}/u.test(ch)) return ch;
      if (!seenLetter) {
        seenLetter = true;
        return ch.toLocaleUpperCase(locale);
      }
      return ch.toLocaleLowerCase(locale);
    })
    .join('');
}

function applyWordPattern(word: string, pattern: WordPattern, sourceWord: string, locale?: string): string {
  switch (pattern) {
    case 'upper':
      return word.toLocaleUpperCase(locale);
    case 'lower':
      return word.toLocaleLowerCase(locale);
    case 'title':
      return titleCaseWord(word, locale);
    case 'mixed': {
      const srcLetters = lettersOf(sourceWord);
      const dstLetters = lettersOf(word);
      if (srcLetters.length === dstLetters.length) {
        let i = 0;
        return [...word]
          .map((ch) => {
            if (!/\p{L}/u.test(ch)) return ch;
            const src = srcLetters[i++];
            if (isUpperChar(src, locale)) return ch.toLocaleUpperCase(locale);
            if (isLowerChar(src, locale)) return ch.toLocaleLowerCase(locale);
            return ch;
          })
          .join('');
      }
      return isUpperChar(lettersOf(sourceWord)[0] ?? '', locale)
        ? titleCaseWord(word, locale)
        : word.toLocaleLowerCase(locale);
    }
    default:
      return word;
  }
}

function capitalizeSentences(text: string, locale?: string): string {
  return text.replace(/(^|[.!?¡¿]\s*)(\P{L}*)(\p{L})/gu, (_, lead: string, punct: string, letter: string) => (
    `${lead}${punct}${letter.toLocaleUpperCase(locale)}`
  ));
}

function wordsOf(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

/** Dominant casing of the source string (ignores leading/trailing space). */
export function detectTranslationCase(source: string, locale?: string): TranslationCasePattern {
  const trimmed = source.trim();
  const letters = lettersOf(trimmed);
  if (!letters.length) return 'mixed';
  const hasUpper = letters.some((ch) => isUpperChar(ch, locale));
  const hasLower = letters.some((ch) => isLowerChar(ch, locale));
  if (hasUpper && !hasLower) return 'upper';
  if (hasLower && !hasUpper) return 'lower';

  const patterns = wordsOf(trimmed).map((word) => wordPattern(word, locale)).filter((p) => p !== 'none');
  if (!patterns.length) return 'mixed';
  if (patterns.every((p) => p === 'title' || p === 'upper')) {
    // A single capitalized word is sentence case, not Title Case.
    return patterns.length === 1 && patterns[0] === 'title' ? 'sentence' : 'title';
  }

  const first = patterns[0];
  const rest = patterns.slice(1);
  if ((first === 'title' || first === 'upper') && rest.some((p) => p === 'lower')) return 'sentence';
  return 'mixed';
}

/**
 * Re-apply the source string's capitalization onto a translated string.
 * Google / glossary output is often flattened to lowercase — this restores ALL CAPS,
 * Title Case, sentence case, or per-word mapping when word counts match.
 */
export function preserveTranslationCase(translated: string, source: string, locale?: string): string {
  if (!translated) return translated;
  const trimmed = source.trim();
  if (!trimmed) return translated;

  const pattern = detectTranslationCase(source, locale);
  if (pattern === 'upper') return translated.toLocaleUpperCase(locale);
  if (pattern === 'lower') return translated.toLocaleLowerCase(locale);

  const sourceWords = wordsOf(trimmed);
  const translatedWords = wordsOf(translated);
  if (sourceWords.length > 0 && sourceWords.length === translatedWords.length) {
    let i = 0;
    return translated.replace(WORD_RE, (word) => {
      const src = sourceWords[i++];
      return applyWordPattern(word, wordPattern(src, locale), src, locale);
    });
  }

  if (pattern === 'title') {
    return translated.replace(WORD_RE, (word) => titleCaseWord(word, locale));
  }
  if (pattern === 'sentence') {
    return capitalizeSentences(translated, locale);
  }

  const patterns = sourceWords.map((word) => wordPattern(word, locale)).filter((p) => p !== 'none');
  const titleish = patterns.filter((p) => p === 'title' || p === 'upper').length;
  if (patterns.length && titleish > patterns.length / 2) {
    return translated.replace(WORD_RE, (word) => titleCaseWord(word, locale));
  }
  return capitalizeSentences(translated, locale);
}
