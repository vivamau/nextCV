const { getVectorDb } = require('./backend/config/vectorDb');
const { CANDIDATES_TABLE, TORS_TABLE } = require('./backend/services/vectorService');

async function check() {
  try {
    const db = await getVectorDb();
    const tables = await db.tableNames();
    console.log("Tables:", tables);
    
    if (tables.includes(CANDIDATES_TABLE)) {
      const candTbl = await db.openTable(CANDIDATES_TABLE);
      const rows = await candTbl.countRows();
      console.log("Candidate vectors indexed:", rows);
    } else {
      console.log("Candidate table is missing!");
    }

    if (tables.includes(TORS_TABLE)) {
      const torTbl = await db.openTable(TORS_TABLE);
      const rows = await torTbl.countRows();
      console.log("TOR vectors indexed:", rows);
    } else {
      console.log("TORS table is missing!");
    }
  } catch (e) {
    console.error(e);
  }
}
check();
