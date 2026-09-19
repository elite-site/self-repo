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

