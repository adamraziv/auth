import { describe, expect, it } from "vitest";
import { Pool } from "pg";

import { assertTestDatabaseUrl } from "../helpers/test-db.js";

describe("integration test harness", () => {
  it("uses the isolated PostgreSQL test database", async () => {
    const databaseUrl = assertTestDatabaseUrl();
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const result = await pool.query<{ current_database: string }>("SELECT current_database()");

      expect(result.rows[0]?.current_database).toBe("bibot_auth_test");
    } finally {
      await pool.end();
    }
  });
});
