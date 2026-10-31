import { describe, it, expect } from 'vitest';
import { extractFirstName, toTitleCase } from '../useDashboard';

describe('extractFirstName', () => {
  it('extracts the given/first name from uppercase "SURNAME GIVENNAME"', () => {
    expect(extractFirstName('ADABALA BHAVITHA')).toBe('Bhavitha');
  });

  it('extracts the given/first name from mixed-case "Surname GivenName"', () => {
    expect(extractFirstName('Adabala Bhavitha')).toBe('Bhavitha');
  });

  it('handles multi-word given names after a surname', () => {
    expect(extractFirstName('CHINTHA SAI TEJA')).toBe('Sai Teja');
    expect(extractFirstName('KOPPISETTI PHANI KUMAR')).toBe('Phani Kumar');
  });

  it('handles leading surname initials', () => {
    expect(extractFirstName('K. BHAVITHA')).toBe('Bhavitha');
    expect(extractFirstName('A BHAVITHA')).toBe('Bhavitha');
  });

  it('handles trailing initials when format is GivenName Initial', () => {
    expect(extractFirstName('BHAVITHA A.')).toBe('Bhavitha');
    expect(extractFirstName('BHAVITHA K')).toBe('Bhavitha');
  });

  it('handles a single name word', () => {
    expect(extractFirstName('BHAVITHA')).toBe('Bhavitha');
    expect(extractFirstName('bhavitha')).toBe('Bhavitha');
  });

  it('falls back to "there" for undefined, null, or empty string', () => {
    expect(extractFirstName(undefined)).toBe('there');
    expect(extractFirstName(null)).toBe('there');
    expect(extractFirstName('')).toBe('there');
    expect(extractFirstName('   ')).toBe('there');
    expect(extractFirstName('there')).toBe('there');
  });
});

describe('toTitleCase', () => {
  it('converts all-caps strings to Title Case', () => {
    expect(toTitleCase('BHAVITHA')).toBe('Bhavitha');
    expect(toTitleCase('SAI TEJA')).toBe('Sai Teja');
  });
});
