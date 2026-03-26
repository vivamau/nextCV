const lancedb = require('vectordb');
const path = require('path');
const fs = require('fs');

const VECTOR_DB_DIR = path.resolve(__dirname, '../data/lancedb');
let dbConnection = null;

async function getVectorDb() {
  if (dbConnection) return dbConnection;
  if (!fs.existsSync(VECTOR_DB_DIR)) {
    fs.mkdirSync(VECTOR_DB_DIR, { recursive: true });
  }
  dbConnection = await lancedb.connect(VECTOR_DB_DIR);
  return dbConnection;
}

function resetConnection() { dbConnection = null; }

module.exports = { getVectorDb, resetConnection, VECTOR_DB_DIR };
