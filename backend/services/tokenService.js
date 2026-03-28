const { getDb } = require('../config/db');

function logTokenUsage({ provider, model, operation, promptTokens = 0, completionTokens = 0 }, db = getDb()) {
  const total = promptTokens + completionTokens;
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO token_usage (provider, model, operation, prompt_tokens, completion_tokens, total_tokens)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [provider, model, operation, promptTokens, completionTokens, total],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function getTokenSummary(db = getDb()) {
  return new Promise((resolve, reject) => {
    const queries = [
      db.get.bind(db, `SELECT COALESCE(SUM(total_tokens), 0) as totalTokens,
                               COALESCE(SUM(prompt_tokens), 0) as totalPromptTokens,
                               COALESCE(SUM(completion_tokens), 0) as totalCompletionTokens
                        FROM token_usage`),
      db.all.bind(db, `SELECT model, SUM(total_tokens) as total_tokens, COUNT(*) as count
                        FROM token_usage GROUP BY model ORDER BY total_tokens DESC`),
      db.all.bind(db, `SELECT operation, SUM(total_tokens) as total_tokens, COUNT(*) as count
                        FROM token_usage GROUP BY operation ORDER BY total_tokens DESC`),
    ];
    Promise.all(queries.map(q => new Promise((res, rej) => q((e, r) => e ? rej(e) : res(r)))))
      .then(([totals, byModel, byOperation]) =>
        resolve({
          totalTokens: totals.totalTokens,
          totalPromptTokens: totals.totalPromptTokens,
          totalCompletionTokens: totals.totalCompletionTokens,
          byModel,
          byOperation,
        })
      )
      .catch(reject);
  });
}

function getTokenUsage({ from, to, groupBy, limit }, db = getDb()) {
  return new Promise((resolve, reject) => {
    let sql, params = [];

    if (groupBy === 'day') {
      sql = `SELECT DATE(created_at) as date, SUM(total_tokens) as total_tokens,
                    SUM(prompt_tokens) as prompt_tokens, SUM(completion_tokens) as completion_tokens,
                    COUNT(*) as count
             FROM token_usage`;
      const conditions = [];
      if (from) { conditions.push('created_at >= ?'); params.push(from); }
      if (to) { conditions.push('created_at <= ?'); params.push(to); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' GROUP BY DATE(created_at) ORDER BY date DESC';
    } else if (groupBy === 'operation') {
      sql = `SELECT operation, SUM(total_tokens) as total_tokens, COUNT(*) as count
             FROM token_usage`;
      const conditions = [];
      if (from) { conditions.push('created_at >= ?'); params.push(from); }
      if (to) { conditions.push('created_at <= ?'); params.push(to); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' GROUP BY operation ORDER BY total_tokens DESC';
    } else if (groupBy === 'model') {
      sql = `SELECT model, SUM(total_tokens) as total_tokens, COUNT(*) as count
             FROM token_usage`;
      const conditions = [];
      if (from) { conditions.push('created_at >= ?'); params.push(from); }
      if (to) { conditions.push('created_at <= ?'); params.push(to); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' GROUP BY model ORDER BY total_tokens DESC';
    } else {
      sql = 'SELECT * FROM token_usage';
      const conditions = [];
      if (from) { conditions.push('created_at >= ?'); params.push(from); }
      if (to) { conditions.push('created_at <= ?'); params.push(to); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY id DESC';
      if (limit) { sql += ' LIMIT ?'; params.push(limit); }
    }

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = { logTokenUsage, getTokenSummary, getTokenUsage };
