import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();

  const queries = [
    // RENAME TABLES
    `ALTER TABLE IF EXISTS "item" RENAME TO "equipos"`,
    `ALTER TABLE IF EXISTS "item_codigo_sie" RENAME TO "equipo_codigo_sie"`,
    `ALTER TABLE IF EXISTS "caja_item" RENAME TO "caja_equipo"`,
    `ALTER TABLE IF EXISTS "caja_item_codigo_sie" RENAME TO "caja_equipo_codigo_sie"`,
    `ALTER TABLE IF EXISTS "movimiento_item" RENAME TO "movimiento_equipo"`,
    `ALTER TABLE IF EXISTS "stock_operacion_item" RENAME TO "stock_operacion_equipo"`,

    // RENAME COLUMNS in the newly renamed tables
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
