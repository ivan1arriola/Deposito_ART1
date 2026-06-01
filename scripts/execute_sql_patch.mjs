import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  const sqlFilePath = path.resolve('prisma/patches/20260531_rename_equipo_table_to_equipos.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  
  console.log('Executing patch from file:', sqlFilePath);
  try {
    await client.query(sql);
    console.log('Patch executed successfully.');
  } catch (error) {
    console.error('Error executing patch:', error.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
