import pkg from 'pg-connection-string';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const { parse } = pkg;
const { Pool } = pg;

// Parse the string into a structured configuration object safely
const connectionConfig = parse(process.env.DATABASE_URL);

const pool = new Pool(connectionConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
