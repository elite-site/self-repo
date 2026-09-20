import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { importRoster } from '../scripts/import-roster';

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

// Students_Master_List.xlsx lives at the repo root (one level above backend/).
const ROSTER_XLSX = path.resolve(__dirname, '../../Students_Master_List.xlsx');

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
      update: { name: event.name, slug: event.slug, year: event.year, status: event.status },
      create: event,
    });
    console.log(`  ✓ Event ready: ${event.name} (${event.id})`);
  }

  console.log('🎓 Seeding student roster from Students_Master_List.xlsx...');
  const count = await importRoster(ROSTER_XLSX);
  console.log(`  ✓ ${count} students imported`);
  const blankCount = await prisma.student.count({ where: { email: null } });
  console.log(`  ✓ ${blankCount} students have no email yet (kept NULL — locked out of SSO until re-import)`);

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