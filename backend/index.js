const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { runMigrations } = require('./services/dbService');
const { waitForDbReady } = require('./config/db');
const candidateRoutes = require('./routes/candidateRoutes');
const torRoutes = require('./routes/torRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const vacancyRoutes = require('./routes/vacancyRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/candidates', candidateRoutes);
app.use('/api/tors', torRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/vacancies', vacancyRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const swaggerDoc = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

async function start() {
  await waitForDbReady();
  await runMigrations();
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start().catch(err => { console.error(err); process.exit(1); });

module.exports = app;
