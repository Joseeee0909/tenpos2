import app from './src/App.js';
import prisma from './src/lib/prisma.js';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to Postgres via Prisma');
  } catch (err) {
    console.error('Prisma connection error:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

start();