import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const DEFAULT_EVENTS = [
  {
    id: 'self-introduction-2026',
    name: 'Self Introduction',
    slug: 'self-introduction',
    year: 2026,
    status: 'OPEN' as const,
  },
];

// Students_Login_Credentials.xlsx lives at the repo root (one level above backend/).
const ROSTER_XLSX = path.resolve(__dirname, '../../Students_Login_Credentials.xlsx');

const YEAR_MAP: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

async function seedStudents() {
  if (!fs.existsSync(ROSTER_XLSX)) {
    console.warn(`⚠️  ${ROSTER_XLSX} not found — skipping student roster import.`);
    return 0;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(ROSTER_XLSX);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    console.warn('⚠️  Roster workbook has no worksheets — skipping student import.');
    return 0;
  }

  let imported = 0;
  const salt = await bcrypt.genSalt(10);

  // Columns: Name, Roll No, Password, Year, Class, Section
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const getCell = (col: number): string => {
      const v = row.getCell(col).value;
      if (v === null || v === undefined) return '';
      const val = typeof v === 'object' && 'text' in v ? (v as any).text : v;
      return String(val).trim();
    };

    const name = getCell(1);
    const rollNo = getCell(2).toUpperCase();
    const yearText = getCell(4).toUpperCase();
    const section = getCell(6).toUpperCase();

    if (!name || !rollNo || !section) continue;

    const year = YEAR_MAP[yearText] || parseInt(yearText, 10) || 0;
    if (![2, 3, 4].includes(year)) continue;

    const passwordHash = await bcrypt.hash(rollNo, salt);

    await prisma.student.upsert({
      where: { rollNo },
      update: {
        name,
        year,
        section,
        passwordHash,
      },
      create: {
        rollNo,
        name,
        year,
        section,
        branch: 'IT',
        passwordHash,
      },
    });
    imported += 1;
  }

  return imported;
}

async function seedAdmin() {
  const adminUsername = (process.env.ADMIN_DEFAULT_USERNAME || 'ADMIN').toUpperCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ADMIN123';

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const existing = await prisma.adminUser.findFirst({
    where: { OR: [{ username: adminUsername }, { email: adminUsername.toLowerCase() }] },
  });

  const admin = await prisma.adminUser.upsert({
    where: { id: existing?.id || '' },
    update: { username: adminUsername, passwordHash },
    create: {
      username: adminUsername,
      email: adminUsername.toLowerCase(),
      passwordHash,
    },
  });

  console.log(`✅ Admin user ready: username=${admin.username} (id: ${admin.id})`);
}

async function main() {
  console.log('🌱 Seeding initial events...');
  for (const event of DEFAULT_EVENTS) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: {
        name: event.name,
        slug: event.slug,
        year: event.year,
        status: event.status,
      },
      create: event,
    });
    console.log(`  ✓ Event ready: ${event.name} (${event.id})`);
  }

  console.log('🎓 Seeding student roster from Students_Login_Credentials.xlsx...');
  const count = await seedStudents().catch((e) => {
    console.error('❌ Failed to seed students:', e);
    return 0;
  });
  console.log(`  ✓ ${count} students imported`);

  await seedAdmin();
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });