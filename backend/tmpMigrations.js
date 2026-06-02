import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT migration_name, finished_at, applied_steps_count FROM \"_prisma_migrations\" ORDER BY finished_at DESC LIMIT 20;");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
