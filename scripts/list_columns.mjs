import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipos'");
  console.log(res.rows.map(r => r.column_name).sort());
  await client.end();
}

run().catch(console.error);
