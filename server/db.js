const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Force clean slate for schema changes (Optional: remove this in prod)
  // await db.exec("DROP TABLE IF EXISTS files");
  // await db.exec("DROP TABLE IF EXISTS users");
  
  // Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
  `);

  // Create Files Table
  // Added 'filename' to store the UUID name on disk
  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      original_name TEXT,
      filename TEXT, 
      path TEXT,
      size INTEGER,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_folder INTEGER DEFAULT 0,
      parent_id INTEGER DEFAULT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  
  // Migration check (if table wasn't dropped)
  try { await db.exec("ALTER TABLE files ADD COLUMN filename TEXT;"); } catch (e) {}
  try { await db.exec("ALTER TABLE files ADD COLUMN is_folder INTEGER DEFAULT 0;"); } catch (e) {}
  try { await db.exec("ALTER TABLE files ADD COLUMN parent_id INTEGER DEFAULT NULL;"); } catch (e) {}

  console.log('Database initialized');
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

module.exports = { initDB, getDB };
