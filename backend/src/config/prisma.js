import pkg from 'pg-connection-string';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';

const { parse } = pkg;
const { Pool } = pg;

const connectionConfig = parse(process.env.DATABASE_URL);

// connectionConfig.ssl = {
//   ca: fs.readFileSync('/app/certs/rds-global-bundle.pem', 'utf8'),
//   rejectUnauthorized: true,
// };

const pool = new Pool(connectionConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
