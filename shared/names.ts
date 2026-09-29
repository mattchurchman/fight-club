const SUFFIXES = new Set(['jr', 'sr', 'ii']);

/** Lowercase, strip diacritics/punctuation, drop generational suffixes, collapse spaces. */
export function normalizeName(s: string): string {
  const stripped = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ');

  const words = stripped.split(/\s+/).filter((w) => w.length > 0 && !SUFFIXES.has(w));
  return words.join(' ');
}

/** Exact match on normalized names, or same last name + matching first initial. */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) {
    return true;
  }

  const wordsA = na.split(' ').filter(Boolean);
  const wordsB = nb.split(' ').filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) {
    return false;
  }

  const lastA = wordsA[wordsA.length - 1]!;
  const lastB = wordsB[wordsB.length - 1]!;
  const initialA = wordsA[0]![0];
  const initialB = wordsB[0]![0];

  return lastA === lastB && initialA === initialB;
}
