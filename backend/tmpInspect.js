import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='Configuracion' ORDER BY column_name;");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
