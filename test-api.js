const { getVectorDb } = require('./backend/config/vectorDb');
const { CANDIDATES_TABLE, TORS_TABLE } = require('./backend/services/vectorService');

async function testEndpoint() {
  try {
    const db = await getVectorDb();
    const torTbl = await db.openTable(TORS_TABLE);
    const candTbl = await db.openTable(CANDIDATES_TABLE);
    
    // get the tor vector
    const torRows = await torTbl.filter("id = 2").limit(1).execute();
    if (!torRows.length) return console.log("TOR not found");
    const torVector = torRows[0].vector;

    try {
      const res = await candTbl.search(torVector).metricType('cosine').limit(3).execute();
      console.log("Cosine Distance:", res.map(r => r._distance));
    } catch(e) {
      console.log("metricType failed:", e.message);
    }
  } catch (e) {
    console.error(e);
  }
}
testEndpoint();
testEndpoint();
