import { Sequelize } from 'sequelize';
import sqlJsAsSqlite3 from 'sql.js-as-sqlite3';
import fs from 'fs';
import path from 'path';

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

if (isUsingRDS) {
  sequelize = new Sequelize({
    database: process.env.RDS_DB_NAME,
    username: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    host: process.env.RDS_HOSTNAME,
    port: process.env.RDS_PORT || defaultPort,
    dialect: dbType,
    logging: false
  });
} else {
  // If in production on Vercel and the DB doesn't exist in /tmp yet, copy it over from the project root
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
    logging: false
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
  try {
    const dbInstance = await sequelize.connectionManager.getConnection();
    const binaryArray = dbInstance.database.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}