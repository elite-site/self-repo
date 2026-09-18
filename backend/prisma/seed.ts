import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

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

// Sample student roster so the auto-fill lookup and dashboard progress work
// during development. Replace with real data via the admin "Students > Import" tab.
const SAMPLE_STUDENTS = [
  { rollNo: '25K61A1201', name: 'A. Nandini', branch: 'IT', section: 'A', year: 2, email: 'nandini@sasi.ac.in' },
  { rollNo: '25K61A1202', name: 'B. Sai Teja', branch: 'IT', section: 'A', year: 2, email: 'saiteja@sasi.ac.in' },
  { rollNo: '25K61A1203', name: 'C. Deepthi', branch: 'IT', section: 'B', year: 2, email: 'deepthi@sasi.ac.in' },
  { rollNo: '24K61A1204', name: 'D. Harsha', branch: 'IT', section: 'A', year: 3, email: 'harsha@sasi.ac.in' },
  { rollNo: '24K61A1205', name: 'E. Rahul', branch: 'IT', section: 'B', year: 3, email: 'rahul@sasi.ac.in' },
  { rollNo: '23K61A1206', name: 'F. Sneha', branch: 'IT', section: 'B', year: 4, email: 'sneha@sasi.ac.in' },
];

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

  console.log(`🌱 Seeding sample student roster (${SAMPLE_STUDENTS.length} students)...`);
  for (const student of SAMPLE_STUDENTS) {
    await prisma.student.upsert({
      where: { eventId_rollNo: { eventId: DEFAULT_EVENTS[0].id, rollNo: student.rollNo } },
      update: { ...student },
      create: { eventId: DEFAULT_EVENTS[0].id, ...student },
    });
  }
  console.log('  ✓ Sample students ready');

  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@club.internal').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminPassword123!';

  console.log(`🌱 Seeding initial admin user: ${adminEmail}`);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
    },
  });

  console.log(`✅ Admin user ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

