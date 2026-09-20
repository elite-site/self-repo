import { describe, it, expect } from 'vitest';
import { parseRosterRow, RosterRow } from '../scripts/roster-parser';

const blank: RosterRow = { email: '', rollNo: '25K61A1201', name: 'Test Student', year: 2, section: 'A', branch: 'IT' };

describe('parseRosterRow', () => {
  it('turns a blank email into null', () => {
    expect(parseRosterRow(blank).email).toBeNull();
  });

  it('normalises roll number to uppercase and trims email to lowercase', () => {
    const parsed = parseRosterRow({ ...blank, email: '  AAKHILA251201@SASI.AC.IN ', rollNo: ' 25k61a1201 ' });
    expect(parsed.rollNo).toBe('25K61A1201');
    expect(parsed.email).toBe('aakhila251201@sasi.ac.in');
  });

  it('defaults branch to IT when empty', () => {
    expect(parseRosterRow({ ...blank, branch: '' }).branch).toBe('IT');
  });
});