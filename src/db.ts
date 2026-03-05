import { PrismaClient } from '@prisma/client';

// Create a single instance of Prisma Client to be used across the application
const prisma = new PrismaClient();

export default prisma;
