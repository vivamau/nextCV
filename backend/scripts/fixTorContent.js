// Clears binary file_content from TORs so they can be re-uploaded properly
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/cvs.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.all("SELECT id, name, file_name, substr(file_content,1,4) as magic FROM tors WHERE file_content IS NOT NULL", (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  rows.forEach(r => {
    const isBinary = r.magic && (r.magic.startsWith('PK') || r.magic.charCodeAt(0) < 32);
    console.log(`TOR ${r.id} "${r.name}" (${r.file_name}): ${isBinary ? 'BINARY — clearing' : 'OK text'}`);
    if (isBinary) {
      db.run('UPDATE tors SET file_content = NULL WHERE id = ?', [r.id]);
    }
  });
  setTimeout(() => { db.close(); process.exit(0); }, 500);
});
