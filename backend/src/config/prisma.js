import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config'; // Ensures variables are loaded here as well


// 1. Create a connection pool using your connection string
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 2. Instantiate the Prisma driver adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter directly into PrismaClient
export const prisma = new PrismaClient({ adapter });
