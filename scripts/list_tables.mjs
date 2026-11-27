import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log(res.rows.map((r) => r.table_name).sort());
  await client.end();
}

run().catch(console.error);
