const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Resolve DB_PATH relative to the backend directory, not current working directory
const DB_PATH = process.env.DB_PATH
  ? path.isAbsolute(process.env.DB_PATH)
    ? process.env.DB_PATH
    : path.join(__dirname, '..', process.env.DB_PATH)
  : path.join(__dirname, '../data/cvs.sqlite');

let db;
let dbReady = false;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('DB connection error:', err.message);
        dbReady = true;
      } else {
        // Run PRAGMA statements sequentially before marking db as ready
        db.run('PRAGMA journal_mode=WAL', (err) => {
          if (err) console.error('Error setting journal_mode:', err.message);
          db.run('PRAGMA foreign_keys=ON', (err) => {
            if (err) console.error('Error setting foreign_keys:', err.message);
            dbReady = true;
          });
        });
      }
    });
  }
  return db;
}

module.exports = { getDb };

module.exports = { getDb };
