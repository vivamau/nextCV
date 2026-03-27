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
let dbInitPromise = null;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('DB connection error:', err.message);
        if (dbInitPromise) {
          dbInitPromise.reject(err);
          dbInitPromise = null;
        }
      }
    });
    
    // Create a promise that resolves when the database is fully initialized
    dbInitPromise = new Promise((resolve, reject) => {
      db.run('PRAGMA journal_mode=WAL', (err) => {
        if (err) {
          console.error('Error setting journal_mode:', err.message);
          reject(err);
          return;
        }
        db.run('PRAGMA foreign_keys=ON', (err) => {
          if (err) {
            console.error('Error setting foreign_keys:', err.message);
            reject(err);
            return;
          }
          dbReady = true;
          resolve();
        });
      });
    });
  }
  return db;
}

// Function to wait for database initialization
function waitForDbReady() {
  if (dbReady) return Promise.resolve();
  if (dbInitPromise) return dbInitPromise;
  return Promise.resolve();
}

module.exports = { getDb, waitForDbReady };
