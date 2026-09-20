import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { parseRosterRow, RosterRow } from './roster-parser';

const prisma = new PrismaClient();

/**
 * Idempotent roster import keyed by rollNo.
 * Reads the sheet named "Students" (or the first worksheet) from the committed
 * Excel file and upserts each student. A filled email is always applied; a
 * blank email stores `null` WITHOUT wiping a previously imported real email.
 */
export async function importRoster(xlsxPath: string): Promise<number> {
  if (!fs.existsSync(xlsxPath)) throw new Error(`Roster not found: ${xlsxPath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.getWorksheet('Students') || wb.worksheets[0];
  if (!ws) throw new Error('Roster workbook has no worksheets');

  const cellText = (row: ExcelJS.Row, col: number): string => {
    const v = row.getCell(col).value;
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' && 'text' in v ? String((v as { text: unknown }).text) : String(v);
    return s.trim();
  };

  let imported = 0;
  for (let r = 2; r <= ws.actualRowCount; r++) {
    const row = ws.getRow(r);

    let year = parseInt(cellText(row, 4), 10);
    if (Number.isNaN(year)) year = 0;

    const parsed = parseRosterRow({
      email: cellText(row, 1),
      rollNo: cellText(row, 2),
      name: cellText(row, 3),
      year,
      section: cellText(row, 5),
      branch: cellText(row, 6) || 'IT',
    } as RosterRow);

    if (!parsed.rollNo || !parsed.name) continue;

    const existing = await prisma.student.findUnique({ where: { rollNo: parsed.rollNo } });

    await prisma.student.upsert({
      where: { rollNo: parsed.rollNo },
      update: {
        name: parsed.name,
        year: parsed.year,
        section: parsed.section,
        branch: parsed.branch,
        // Only ever write an email forward; a blank cell never wipes a real one.
        ...(parsed.email ? { email: parsed.email } : existing?.email ? { email: existing.email } : { email: null }),
      },
      create: {
        rollNo: parsed.rollNo,
        name: parsed.name,
        year: parsed.year,
        section: parsed.section,
        branch: parsed.branch,
        email: parsed.email,
      },
    });
    imported += 1;
  }
  return imported;
}

if (require.main === module) {
  const target = process.argv[2] || path.resolve(__dirname, '../../Students_Master_List.xlsx');
  importRoster(target)
    .then((n) => {
      console.log(`✓ imported ${n} students from ${target}`);
      return prisma.$disconnect();
    })
    .catch((e) => {
      console.error('❌ Roster import failed:', e);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}