import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_NAME = process.env.DB_NAME || 'rithamic_familytree';

async function updateDb() {
  console.log(`\n=== 🔄 Running Idempotent Update Script (ritham20261.sql) on '${DB_NAME}' ===`);

  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    const updateSqlPath = path.join(process.cwd(), 'sql', 'ritham20261.sql');
    const sql = fs.readFileSync(updateSqlPath, 'utf8');

    await pool.query(sql);
    console.log("✅ Update script ritham20261.sql executed successfully without conflict.");

    const migrationRes = await pool.query("SELECT migration_name, applied_at FROM schema_migrations ORDER BY id DESC;");
    console.log("\nMigration History:");
    migrationRes.rows.forEach(r => console.log(` - ${r.migration_name} (Last updated: ${r.applied_at})`));

    const memberCount = await pool.query(`SELECT COUNT(*) FROM family_members`);
    const branchCount = await pool.query(`SELECT COUNT(*) FROM family_branches`);
    const relCount = await pool.query(`SELECT COUNT(*) FROM family_relationships`);

    console.log(`\nDatabase State Summary:`);
    console.log(` - Branches: ${branchCount.rows[0].count}`);
    console.log(` - Members: ${memberCount.rows[0].count}`);
    console.log(` - Relationships: ${relCount.rows[0].count}`);

    await pool.end();
    console.log("\n✨ Database update complete!\n");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed to run update script. Details:", err.message);
    try { await pool.end(); } catch {}
    process.exit(1);
  }
}

updateDb();
