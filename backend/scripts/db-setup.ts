import { PrismaClient } from '@prisma/client';

/**
 * Idempotent database bootstrap.
 * Ensures the target Postgres schema exists before `prisma db push` / `prisma seed`.
 *
 * Reads the schema from the `?schema=` query parameter of DATABASE_URL.
 * If no schema param is present, it defaults to the Prisma client search_path
 * (which for this portal is set explicitly in the connection URL).
 */
const prisma = new PrismaClient();

function getSchemaFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('schema');
  } catch {
    return null;
  }
}

async function main() {
  const url = process.env.DATABASE_URL || '';

  if (!url) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
  }

  const schema = getSchemaFromUrl(url);

  if (!schema) {
    console.log('ℹ️ No ?schema= param in DATABASE_URL — skipping schema creation.');
    return;
  }

  console.log(`🔧 Ensuring schema "${schema}" exists...`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  console.log(`✅ Schema "${schema}" is ready.`);

  await prisma.$disconnect();
}

main()
  .catch(async (err) => {
    console.error('❌ Database bootstrap failed:', err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });