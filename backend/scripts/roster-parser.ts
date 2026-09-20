export interface RosterRow {
  email: string | null;
  rollNo: string;
  name: string;
  year: number;
  section: string;
  branch: string;
}

/**
 * Normalises a single roster row to its canonical form.
 * A blank/untrimmed email becomes `null` (student is locked out of SSO until
 * the roster is re-imported with a real college email). Roll number is
 * uppercased, email lowercased; branch defaults to "IT".
 */
export function parseRosterRow(row: RosterRow): RosterRow {
  const email = (row.email ?? '').trim().toLowerCase();
  return {
    email: email || null,
    rollNo: String(row.rollNo ?? '').trim().toUpperCase(),
    name: String(row.name ?? '').trim(),
    year: Number(row.year) || 0,
    section: String(row.section ?? '').trim().toUpperCase(),
    branch: String(row.branch ?? '').trim().toUpperCase() || 'IT',
  };
}