import { describe, expect, it } from 'vitest';
import { namesMatch, normalizeName } from './names';

describe('normalizeName', () => {
  it('lowercases and collapses spaces', () => {
    expect(normalizeName('  Jon   Jones ')).toBe('jon jones');
  });

  it('strips diacritics', () => {
    expect(normalizeName('José Aldo')).toBe('jose aldo');
    expect(normalizeName('Yair Rodríguez')).toBe('yair rodriguez');
  });

  it('strips punctuation', () => {
    expect(normalizeName("Rafael dos Anjos")).toBe('rafael dos anjos');
    expect(normalizeName('Jean-Marc Ferreira')).toBe('jean marc ferreira');
  });

  it('drops Jr/Sr/II suffixes', () => {
    expect(normalizeName('Rosas Jr.')).toBe('rosas');
    expect(normalizeName('Julio Cesar Sr')).toBe('julio cesar');
    expect(normalizeName('Marcus Carter II')).toBe('marcus carter');
  });

  it('is idempotent on an already-normalized name', () => {
    expect(normalizeName('rosas')).toBe('rosas');
  });
});

describe('namesMatch', () => {
  it('matches exact names after normalization', () => {
    expect(namesMatch('José Aldo', 'Jose Aldo')).toBe(true);
  });

  it('matches when a suffix is dropped on one side', () => {
    expect(namesMatch('Raul Rosas Jr.', 'Raul Rosas')).toBe(true);
  });

  it('matches same last name + first initial', () => {
    expect(namesMatch('Yair Rodríguez', 'Y. Rodriguez')).toBe(true);
  });

  it('rejects same last name with a different first initial', () => {
    expect(namesMatch('Yair Rodriguez', 'Ariel Rodriguez')).toBe(false);
  });

  it('rejects different last names', () => {
    expect(namesMatch('Jon Jones', 'Jon Anderson')).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(namesMatch('', 'Jon Jones')).toBe(false);
  });
});
