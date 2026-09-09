import { Sequelize } from 'sequelize';
import sqlJsAsSqlite3 from 'sql.js-as-sqlite3';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Prefer a full connection string (e.g. Supabase's DATABASE_URL) when present.
const isUsingConnectionString = !!process.env.DATABASE_URL;

const isUsingRDS = process.env.RDS_HOSTNAME && process.env.RDS_USERNAME && process.env.RDS_PASSWORD;
const dbType = process.env.DB_TYPE || 'mysql';
const defaultPorts = {
  mysql: 3306,
  postgres: 5432,
};
const defaultPort = defaultPorts[dbType];

// Use /tmp/database.sqlite on Vercel, and local file otherwise
const dbFilePath = process.env.NODE_ENV === 'production'
  ? '/tmp/database.sqlite'
  : 'database.sqlite';

export let sequelize;

if (isUsingConnectionString) {
  // Supabase (or any Postgres provider) connection string.
  // Use the pooled "transaction mode" URL (port 6543) here in production.
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else if (isUsingRDS) {
  sequelize = new Sequelize({
    database: process.env.RDS_DB_NAME,
    username: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    host: process.env.RDS_HOSTNAME,
    port: process.env.RDS_PORT || defaultPort,
    dialect: dbType,
    dialectModule: dbType === 'postgres' ? pg : undefined,
    logging: false,
    dialectOptions: dbType === 'postgres' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    } : undefined,
  });
} else {
  // Local-only fallback: file-based SQLite via sql.js.
  // NOTE: this does NOT persist reliably on Vercel — for production, set
  // DATABASE_URL (or the RDS_* vars) to point at a real Postgres database.
  if (process.env.NODE_ENV === 'production' && !fs.existsSync(dbFilePath)) {
    const originalDb = path.join(process.cwd(), 'database.sqlite');
    if (fs.existsSync(originalDb)) {
      fs.copyFileSync(originalDb, dbFilePath);
    }
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlJsAsSqlite3,
    storage: dbFilePath,
    logging: false,
  });

  // Save database to file after write operations.
  sequelize.addHook('afterCreate', saveDatabaseToFile);
  sequelize.addHook('afterDestroy', saveDatabaseToFile);
  sequelize.addHook('afterUpdate', saveDatabaseToFile);
  sequelize.addHook('afterSave', saveDatabaseToFile);
  sequelize.addHook('afterUpsert', saveDatabaseToFile);
  sequelize.addHook('afterBulkCreate', saveDatabaseToFile);
  sequelize.addHook('afterBulkDestroy', saveDatabaseToFile);
  sequelize.addHook('afterBulkUpdate', saveDatabaseToFile);
}

export async function saveDatabaseToFile() {
  // Only relevant for the sql.js/local-file fallback branch above.
  if (isUsingConnectionString || isUsingRDS) return;
  try {
    const dbInstance = await sequelize.connectionManager.getConnection();
    const binaryArray = dbInstance.database.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}
