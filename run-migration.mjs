import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not set');
    }

    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbUrl);

    const sqlFile = path.join(__dirname, 'drizzle/migrations/0001_create_tenant_members.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    console.log('Executing migration...');
    await connection.query(sql);
    console.log('✅ Migration completed successfully!');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
