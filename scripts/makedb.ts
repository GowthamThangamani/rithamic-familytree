import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_NAME = process.env.DB_NAME || 'rithamic_familytree';

async function makeDb() {
  console.log(`\n=== 🛠️ Database Provisioning: '${DB_NAME}' ===`);

  const rootPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    const checkDb = await rootPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
    if (checkDb.rowCount === 0) {
      console.log(`Creating database '${DB_NAME}'...`);
      await rootPool.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Database '${DB_NAME}' created.`);
    } else {
      console.log(`ℹ️ Database '${DB_NAME}' already exists.`);
    }
  } catch (err: any) {
    console.warn(`Notice during database check/create:`, err.message);
  } finally {
    await rootPool.end();
  }

  // Connect to target DB and apply migration
  const appPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  try {
    const sqlPath = path.join(process.cwd(), 'sql', 'ritham20261.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await appPool.query(sql);
    console.log(`✅ Applied migration ritham20261.sql successfully.`);

    const res = await appPool.query(`SELECT COUNT(*) FROM family_members`);
    console.log(`📊 Total members registered: ${res.rows[0].count}`);
    await appPool.end();
    console.log(`\n✨ db:make completed successfully!\n`);
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ db:make failed:`, err.message);
    try { await appPool.end(); } catch {}
    process.exit(1);
  }
}

makeDb();
