import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from "@prisma/client";
let prisma: PrismaClient;

if (!globalThis.prisma) {
  prisma = new PrismaClient();
  globalThis.prisma = prisma;
} else {
  prisma = globalThis.prisma;
}

export default prisma;
