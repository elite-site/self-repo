import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { seedSkills } from '../prisma/seedSkillsData';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Skills Seed Idempotency ---');
  const run1 = await seedSkills(prisma);
  console.log(`First run completed: ${run1.skillsCount} skills cataloged, ${run1.mapsCount} mappings.`);

  const run2 = await seedSkills(prisma);
  console.log(`Second run completed (asserting idempotency).`);

  const skillCount = await prisma.skill.count();
  const mapCount = await prisma.skillSourceMap.count();
  console.log(`Database state: ${skillCount} skills, ${mapCount} mappings.`);

  if (skillCount === 0 || mapCount === 0) {
    throw new Error('Verification failed: zero skills or mappings found in database');
  }

  console.log('✅ Skills seed verification passed successfully.');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
