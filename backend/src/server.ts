import { app } from './app.js';
import { env } from './config.js';
import { pool } from './db.js';
import { logger } from './logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Backend iniciado na porta ${env.PORT}`);
});

async function shutdown() {
  logger.info('Encerrando backend...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

