import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();

  const queries = [
    // Rename tables (just in case they weren't renamed yet)
    `ALTER TABLE IF EXISTS "equipo" RENAME TO "equipos"`,
    // Rename columns
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipos' AND column_name = 'item_id') THEN ALTER TABLE "equipos" RENAME COLUMN "item_id" TO "equipo_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipos' AND column_name = 'tipo_item_id') THEN ALTER TABLE "equipos" RENAME COLUMN "tipo_item_id" TO "tipo_equipo_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipo_codigo_sie' AND column_name = 'item_codigo_sie_id') THEN ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "item_codigo_sie_id" TO "equipo_codigo_sie_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipo_codigo_sie' AND column_name = 'item_id') THEN ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "item_id" TO "equipo_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'caja_equipo' AND column_name = 'item_id') THEN ALTER TABLE "caja_equipo" RENAME COLUMN "item_id" TO "equipo_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'caja_equipo_codigo_sie' AND column_name = 'item_codigo_sie_id') THEN ALTER TABLE "caja_equipo_codigo_sie" RENAME COLUMN "item_codigo_sie_id" TO "equipo_codigo_sie_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_operacion_equipo' AND column_name = 'item_id') THEN ALTER TABLE "stock_operacion_equipo" RENAME COLUMN "item_id" TO "equipo_id"; END IF; END $$;`,
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimiento_equipo' AND column_name = 'item_id') THEN ALTER TABLE "movimiento_equipo" RENAME COLUMN "item_id" TO "equipo_id"; END IF; END $$;`,
  ];

  for (const q of queries) {
    console.log("Executing:", q);
    try {
      await client.query(q);
      console.log("Success.");
    } catch (e) {
      console.error("Error executing query:", e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
