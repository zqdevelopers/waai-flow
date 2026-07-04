import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database', error);
    process.exit(1);
  }
}
