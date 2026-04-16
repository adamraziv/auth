import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(databaseUrl: string) {
  pool ??= new Pool({ connectionString: databaseUrl });
  return pool;
}

export function assertTestDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl || !databaseUrl.includes("test")) {
    throw new Error("Refusing to reset a non-test database. DATABASE_URL must include test.");
  }

  return databaseUrl;
}

export async function resetTestDatabase() {
  const databaseUrl = assertTestDatabaseUrl();

  try {
    await getPool(databaseUrl).query(
      'TRUNCATE TABLE "verification", "session", "account", "user" RESTART IDENTITY CASCADE'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to reset Better Auth test tables. Run rtk proxy bash -lc 'cd auth && npm run test:db:prepare' before integration tests. Original error: ${message}`
    );
  }
}

export async function closeTestDatabase() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}
