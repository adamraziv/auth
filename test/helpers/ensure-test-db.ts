import { Pool } from "pg";

const adminDatabaseUrl = "postgres://postgres:postgres@localhost:5432/postgres";
const testDatabaseName = "bibot_auth_test";

async function main() {
  const pool = new Pool({ connectionString: adminDatabaseUrl });

  try {
    const result = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [testDatabaseName]);

    if (result.rowCount === 0) {
      await pool.query("CREATE DATABASE bibot_auth_test");
    }

    console.log("bibot_auth_test ready");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Start PostgreSQL with docker compose up -d postgres. Original error: ${message}`);
  } finally {
    await pool.end();
  }
}

await main();
