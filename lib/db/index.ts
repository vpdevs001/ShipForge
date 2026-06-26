import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
};

function createDbClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

export const db = globalForDb.db ?? createDbClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
